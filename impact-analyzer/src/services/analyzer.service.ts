import { GitService } from './git.service';
import { AstService } from './ast.service';
import { ImpactedTest, FileDiff } from '../types';
import * as path from 'path';

export class AnalyzerService {
    constructor(
        private gitService: GitService,
        private astService: AstService,
        private repoPath: string
    ) { }

    async analyze(commitSha: string): Promise<ImpactedTest[]> {
        console.log(`Analyzing commit ${commitSha}...`);

        // 1. Get Diff
        const diffs = await this.gitService.getDiff(commitSha);
        const impactedTests: ImpactedTest[] = [];

        // 2. Global Check
        if (this.isGlobalChange(diffs)) {
            return [{
                testName: 'ALL TESTS',
                filePath: 'ALL',
                impactType: 'IMPACTED_BY_DEPENDENCY',
                relatedFile: 'Global Config Change'
            }];
        }

        // 3. Process each file
        for (const fileDiff of diffs) {
            const absolutePath = path.resolve(this.repoPath, fileDiff.filePath);

            // Handle Deleted Files (for removed tests)
            if (fileDiff.changeType === 'DEL') {
                this.detectRemovedTests(fileDiff, impactedTests);
                continue;
            }

            // Ensure file is loaded in AST
            this.astService.addFile(absolutePath);

            if (fileDiff.filePath.endsWith('.spec.ts')) {
                // Direct Impact
                this.detectDirectImpact(fileDiff, absolutePath, impactedTests);
            } else if (fileDiff.filePath.endsWith('.ts')) {
                // Indirect Impact
                this.detectIndirectImpact(fileDiff, absolutePath, impactedTests);
            }
        }

        // Deduplicate
        return this.deduplicate(impactedTests);
    }

    private isGlobalChange(diffs: FileDiff[]): boolean {
        const globalFiles = ['playwright.config.ts', 'package.json', 'global-setup.ts'];
        return diffs.some(d => globalFiles.some(g => d.filePath.endsWith(g)));
    }

    private detectDirectImpact(fileDiff: FileDiff, absolutePath: string, results: ImpactedTest[]) {
        const tests = this.astService.getTestRanges(absolutePath);

        // Check for MODIFIED tests
        for (const line of fileDiff.changedLines) {
            if (line.isDeleted) continue; // Deleted lines in a spec file don't trigger "modified" unless they were part of a test that still exists? 
            // Actually, if I remove a line from a test, that test is modified.
            // But `lineNumber` for deleted lines is from OLD file. AST has NEW file.
            // So we can only map NEW lines to NEW AST.
            // If a test looks like:
            // test('A', () => {
            //   step1();
            //   step2(); // deleted
            // })
            // The diff shows -step2(). 
            // The AST of new file has test('A') wrapping step1().
            // We can't map the deleted line to the new AST easily without offsets.
            // However, usually a modification involves some context or added lines or shift.
            // If strictly ONLY lines are deleted, `changedLines` (ADD) might be empty or just contain context?
            // Wait, my GitService only puts ADD/MOD lines in `changedLines` (unless isDeleted=true).
            // If I delete a line, I have a hunk. I can check if the hunk's new range overlaps with a test.
            // `fileDiff.hunks` has `newStart`, `newLines`.
            // Let's use hunks for intersection!
        }

        // Better approach: Intersect HUNKS with Tests
        // If a hunk overlaps with a test range, that test is modified.
        for (const hunk of fileDiff.hunks) {
            // New range in the file
            const hunkStart = hunk.newStart;
            const hunkEnd = hunk.newStart + (hunk.newLines > 0 ? hunk.newLines - 1 : 0);

            // If it's a pure deletion (newLines=0), it happens AT hunkStart.
            // In standard diff, deletion at line X means line X is gone, so code at X now is different.

            for (const t of tests) {
                // Check overlap
                if (this.intersects(hunkStart, hunkEnd, t.startLine, t.endLine)) {
                    results.push({
                        testName: t.testName,
                        filePath: fileDiff.filePath,
                        impactType: 'MODIFIED'
                    });
                }
            }
        }

        // Check for ADDED tests
        // If a test range is completely contained within a hunk's added lines
        for (const t of tests) {
            // If test is NOT in results yet (or we just re-check)
            // If this test was just added, it must be fully inside a hunk.
            for (const hunk of fileDiff.hunks) {
                if (t.startLine >= hunk.newStart && t.endLine <= (hunk.newStart + hunk.newLines)) {
                    // It is likely a new test
                    // We should verify if it didn't exist before?
                    // Relying on "it is contained in added lines" is a good heuristic.
                    // But strictly, if I wrap an existing test in a new describe block, the indentation changes... diff shows all new lines?
                    // If diff shows all new lines, it IS effectively a new definition from git perspective.

                    // Helper check: is this test ALREADY marked as modified? 
                    // If it is fully inside a hunk, it is ADDED.
                    // If it partially overlaps, it is MODIFIED.

                    // Let's refine:
                    const exists = results.find(r => r.testName === t.testName && r.filePath === fileDiff.filePath);
                    if (exists) {
                        exists.impactType = 'ADDED'; // Upgrade to added?
                    } else {
                        results.push({
                            testName: t.testName,
                            filePath: fileDiff.filePath,
                            impactType: 'ADDED'
                        });
                    }
                }
            }
        }
    }

    private detectIndirectImpact(fileDiff: FileDiff, absolutePath: string, results: ImpactedTest[]) {
        for (const line of fileDiff.changedLines) {
            if (line.isDeleted) continue; // Skip deleted lines for reference tracing for now

            const impacts = this.astService.getImpactedTestsFromSymbolAtLine(absolutePath, line.lineNumber);

            for (const impact of impacts) {
                results.push({
                    testName: impact.testName,
                    filePath: impact.sourceFile.getFilePath(), // Absolute path? ts-morph returns absolute.
                    // We might want relative path for output
                    impactType: 'IMPACTED_BY_DEPENDENCY',
                    relatedFile: fileDiff.filePath
                });
            }
        }
    }

    private detectRemovedTests(fileDiff: FileDiff, results: ImpactedTest[]) {
        // Look at deleted lines
        const deletedLines = fileDiff.changedLines.filter(l => l.isDeleted);

        for (const line of deletedLines) {
            // Regex to match test('name', ...)
            // This is brittle but requested in plan/prompt
            const match = line.content.match(/test\s*\(\s*['"`](.*)['"`]/);
            if (match) {
                results.push({
                    testName: match[1],
                    filePath: fileDiff.filePath,
                    impactType: 'REMOVED'
                });
            }
        }
    }

    private intersects(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
        return aStart <= bEnd && bStart <= aEnd;
    }

    private deduplicate(tests: ImpactedTest[]): ImpactedTest[] {
        const unique = new Map<string, ImpactedTest>();
        for (const t of tests) {
            const key = `${t.filePath}:${t.testName}`;
            if (!unique.has(key)) {
                unique.set(key, t);
            } else {
                // specific logic: if we have MODIFIED and ADDED, keep ADDED?
                // if we have IMPACTED_BY_DEP and MODIFIED, keep MODIFIED?
                const existing = unique.get(key)!;
                if (t.impactType === 'ADDED') existing.impactType = 'ADDED';
                if (t.impactType === 'MODIFIED' && existing.impactType === 'IMPACTED_BY_DEPENDENCY') existing.impactType = 'MODIFIED';
            }
        }
        return Array.from(unique.values()).map(t => ({
            ...t,
            filePath: path.relative(this.repoPath, t.filePath.startsWith('/') ? t.filePath : path.join(this.repoPath, t.filePath))
        }));
    }
}
