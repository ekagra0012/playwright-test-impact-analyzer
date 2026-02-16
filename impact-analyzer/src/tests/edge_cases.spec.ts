import { AnalyzerService } from '../services/analyzer.service';
import { AstService } from '../services/ast.service';
import { GitService } from '../services/git.service';
import { FileDiff, ImpactedTest } from '../types';
import * as path from 'path';
import * as fs from 'fs';
import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';

// Mock GitService
class MockGitService extends GitService {
    private mockDiffs: FileDiff[] = [];

    constructor() {
        super('.'); // Dummy path
    }

    setMockDiffs(diffs: FileDiff[]) {
        this.mockDiffs = diffs;
    }

    async getDiff(commitSha: string): Promise<FileDiff[]> {
        return this.mockDiffs;
    }
}

describe('Edge Cases Analysis', () => {
    let gitService: MockGitService;
    let astService: AstService;
    let analyzer: AnalyzerService;
    const tempDir = path.resolve(__dirname, 'temp_test_files');

    beforeAll(() => {
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        // Initialize real AstService pointing to temp dir
        // We write a dummy tsconfig
        const tsConfigPath = path.join(tempDir, 'tsconfig.json');
        fs.writeFileSync(tsConfigPath, JSON.stringify({
            compilerOptions: { target: 'ES2020', module: 'commonjs' },
            include: ["**/*"]
        }));

        gitService = new MockGitService();
        astService = new AstService(tsConfigPath);
        analyzer = new AnalyzerService(gitService, astService, tempDir);
    });

    afterAll(() => {
        // Cleanup
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('should identify tests with template string names', async () => {
        const filePath = 'template_test.spec.ts';
        const absPath = path.join(tempDir, filePath);
        const content = `
import { test } from '@playwright/test';
const id = 123;
test(\`user \${id} login\`, () => {
    console.log('test body');
});
        `;
        fs.writeFileSync(absPath, content);

        // Mock diff: change inside the test body
        const diffs: FileDiff[] = [{
            filePath: filePath,
            changeType: 'MOD',
            hunks: [{
                oldStart: 4, oldLines: 1,
                newStart: 4, newLines: 1,
                content: '@@ -4 +4 @@'
            }],
            changedLines: [{ lineNumber: 4, content: "    console.log('changed');" }]
        }];

        gitService.setMockDiffs(diffs);

        const results = await analyzer.analyze('dummy_sha', true);

        expect(results).toHaveLength(1);
        expect(results[0].testName).toBe('user ${id} login');
        expect(results[0].impactType).toBe('MODIFIED');
    });

    test('should identify tests with no substitution template literal names', async () => {
        const filePath = 'template_literal_test.spec.ts';
        const absPath = path.join(tempDir, filePath);
        const content = `
import { test } from '@playwright/test';
test(\`simple template\`, () => {
    console.log('body');
});
        `;
        fs.writeFileSync(absPath, content);

        const diffs: FileDiff[] = [{
            filePath: filePath,
            changeType: 'MOD',
            hunks: [{
                oldStart: 3, oldLines: 1,
                newStart: 3, newLines: 1,
                content: '@@ -3 +3 @@'
            }],
            changedLines: [{ lineNumber: 3, content: "    console.log('changed');" }]
        }];
        gitService.setMockDiffs(diffs);

        const results = await analyzer.analyze('dummy_sha', true);

        expect(results).toHaveLength(1);
        expect(results[0].testName).toBe('simple template');
    });

    test('should detect removed tests using improved regex (single quote)', async () => {
        const diffs: FileDiff[] = [{
            filePath: 'deleted.spec.ts',
            changeType: 'MOD', // Could be MOD with deleted lines
            hunks: [], // Not used by detectRemovedTests regex logic directly, only changedLines
            changedLines: [{
                lineNumber: 10,
                content: "test('removed test single quote', () => {})",
                isDeleted: true
            }]
        }];
        gitService.setMockDiffs(diffs);

        const results = await analyzer.analyze('dummy_sha', true);

        const removed = results.filter(r => r.impactType === 'REMOVED');
        expect(removed).toHaveLength(1);
        expect(removed[0].testName).toBe('removed test single quote');
    });

    test('should detect removed tests using improved regex (template literal)', async () => {
        const diffs: FileDiff[] = [{
            filePath: 'deleted_template.spec.ts',
            changeType: 'MOD',
            hunks: [],
            changedLines: [{
                lineNumber: 10,
                content: "test(`removed test template`, () => {})",
                isDeleted: true
            }]
        }];
        gitService.setMockDiffs(diffs);

        const results = await analyzer.analyze('dummy_sha', true);

        const removed = results.filter(r => r.impactType === 'REMOVED');
        expect(removed).toHaveLength(1);
        expect(removed[0].testName).toBe('removed test template');
    });

    test('should detect removed describe blocks', async () => {
        const diffs: FileDiff[] = [{
            filePath: 'deleted_describe.spec.ts',
            changeType: 'MOD',
            hunks: [],
            changedLines: [{
                lineNumber: 10,
                content: "test.describe('removed suite', () => {})",
                isDeleted: true
            }]
        }];
        gitService.setMockDiffs(diffs);

        const results = await analyzer.analyze('dummy_sha', true);

        const removed = results.filter(r => r.impactType === 'REMOVED');
        expect(removed).toHaveLength(1);
        expect(removed[0].testName).toBe('removed suite');
    });

    test('should detect impacts in describe blocks even if outside a test() call (e.g. beforeAll)', async () => {
        // This verifies finding enclosing test/suite logic
        const filePath = 'describe_beforeall.spec.ts';
        const absPath = path.join(tempDir, filePath);
        const content = `
import { test } from '@playwright/test';
test.describe('My Suite', () => {
    test.beforeAll(() => {
        console.log('setup');
    });
    test('test inside', () => {});
});
       `;
        fs.writeFileSync(absPath, content);

        // Mock diff at line 4 (inside beforeAll)
        const diffs: FileDiff[] = [{
            filePath: filePath,
            changeType: 'MOD',
            hunks: [{
                oldStart: 4, oldLines: 1,
                newStart: 4, newLines: 1,
                content: '@@ -4 +4 @@'
            }],
            changedLines: [{ lineNumber: 4, content: "        console.log('changed setup');" }]
        }];
        gitService.setMockDiffs(diffs);

        const results = await analyzer.analyze('dummy_sha', true);

        // Expectations: 
        // Either it marks 'My Suite' (if findEnclosingTest supports describe)
        // Or it fails to find anything.
        // Requirement implies "identifying and isolating... relevant". 
        // Ideally it should mark 'My Suite' or all tests inside 'My Suite'.
        // Current implementation of 'findEnclosingTest' looks for 'isTestCall'. 'test.describe' IS a test call.
        // So it should enable 'My Suite' as impacted.

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].testName).toBe('My Suite');
    });
});
