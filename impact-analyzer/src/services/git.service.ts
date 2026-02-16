import simpleGit, { SimpleGit } from 'simple-git';
import { FileDiff, ChangeType, ChangedLine } from '../types';

export class GitService {
    private git: SimpleGit;

    constructor(repoPath: string) {
        this.git = simpleGit(repoPath);
    }

    async getDiff(commitSha: string): Promise<FileDiff[]> {
        // -U0: unified context 0 (only changed lines)
        // sha^..sha: compare parent to commit
        // We use try-catch to handle potential errors (e.g. first commit)
        try {
            const diffSummary = await this.git.diff([
                '-U0',
                `${commitSha}^`,
                commitSha
            ]);
            return this.parseDiff(diffSummary);
        } catch (error) {
            console.error(`Error getting diff for commit ${commitSha}:`, error);
            throw error;
        }
    }

    private parseDiff(diffOutput: string): FileDiff[] {
        const files: FileDiff[] = [];
        const lines = diffOutput.split('\n');

        let currentFile: FileDiff | null = null;
        let isHeader = true;

        // Regex for diff header: diff --git a/path b/path
        const diffGitRegex = /^diff --git a\/(.*) b\/(.*)$/;
        // Regex for new/deleted file mode
        const newFileModeRegex = /^new file mode \d+$/;
        const deletedFileModeRegex = /^deleted file mode \d+$/;
        // Regex for hunk header: @@ -oldStart,oldLen +newStart,newLen @@
        const hunkHeaderRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

        let currentHunk: { newStart: number; newCount: number; oldStart: number; oldCount: number; currentNew: number; currentOld: number } | null = null;

        for (const line of lines) {
            // 1. Detect new file start
            const diffGitMatch = line.match(diffGitRegex);
            if (diffGitMatch) {
                // Save previous file if exists
                if (currentFile) files.push(currentFile);

                // Initialize new file
                currentFile = {
                    filePath: diffGitMatch[2], // Default to b/path
                    changeType: 'MOD',         // Default, refined later
                    changedLines: [],
                    hunks: []
                };
                isHeader = true;
                currentHunk = null;
                continue;
            }

            if (!currentFile) continue;

            // 2. Parsers within header
            if (isHeader) {
                if (newFileModeRegex.test(line)) {
                    currentFile.changeType = 'ADD';
                } else if (deletedFileModeRegex.test(line)) {
                    currentFile.changeType = 'DEL';
                    // For deleted files, we might want the old path (a/...) but diff --git usually gives it.
                    // The 'diff --git' match index 1 is a/, index 2 is b/.
                    // capturing them:
                    const match = lines.find(l => l === line) ? line.match(diffGitRegex) : null;
                    // Actually we already captured paths. If DEL, we use a/path.
                    // But wait, line iteration... we lost the match object.
                    // Let's refine: verifying if we need to swap path.
                    // Usually b/path is "/dev/null" for deleted? No, diff --git shows both.
                    // +++ /dev/null is strictly reliable.
                }

                if (line.startsWith('--- a/')) {
                    // a path
                } else if (line.startsWith('+++ b/')) {
                    // b path
                } else if (line.startsWith('+++ /dev/null')) {
                    currentFile.changeType = 'DEL';
                    // use the 'a' path captured from `diff --git`? 
                    // In `diff --git a/foo b/foo`, if deleted, `b/foo` might still be `foo`.
                    // If it was deleted, `diff --git a/foo b/foo` usually still says `b/foo`.
                    // The regex above `diffGitMatch[2]` captured `b/...`.
                    // If DEL, `b/` line is `/dev/null`, so we should rely on `diff --git a/...`.
                    // So, if `currentFile.changeType` is 'DEL', we should use `diffGitMatch[1]` for `filePath`.
                    // This needs to be done after the `diffGitMatch` block.
                } else if (line.startsWith('--- /dev/null')) {
                    currentFile.changeType = 'ADD';
                }

                if (line.startsWith('@@')) {
                    isHeader = false;
                }
            }

            // 3. Hunk Parsing
            const hunkMatch = line.match(hunkHeaderRegex);
            if (hunkMatch) {
                isHeader = false; // Just in case
                const oldStart = parseInt(hunkMatch[1], 10);
                const oldLen = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
                const newStart = parseInt(hunkMatch[3], 10);
                const newLen = hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1;

                currentHunk = {
                    oldStart,
                    oldCount: 0,
                    newStart,
                    newCount: 0,
                    currentOld: oldStart,
                    currentNew: newStart
                };

                currentFile.hunks.push({
                    oldStart,
                    oldLines: oldLen,
                    newStart,
                    newLines: newLen,
                    content: line
                });
                continue;
            }

            // 4. Content Parsing (only if in hunk)
            if (!isHeader && currentHunk) {
                const char = line[0];
                if (char === '+') {
                    // Added line (or modified new content)
                    // If file is DEL, we usually don't see +, unless it's a rewrite?
                    // Standard DEL shows - lines.
                    if (currentFile.changeType !== 'DEL') {
                        currentFile.changedLines.push({
                            lineNumber: currentHunk.currentNew,
                            content: line.substring(1)
                        });
                        currentHunk.currentNew++;
                    }
                } else if (char === '-') {
                    // Removed line
                    if (currentFile.changeType === 'DEL') {
                        // For deleted files, all content is -, and we want to capture it to find removed tests
                        currentFile.changedLines.push({
                            lineNumber: currentHunk.currentOld,
                            content: line.substring(1)
                        });
                    } else {
                        // For MOD files, - lines are removed content. 
                        // We might need to track them for "Removed Test" logic even in MOD files.
                        // Let's add them to changedLines but maybe we need a property to distinguish ADD/DEL line?
                        // Our Type ChangedLine implies 'new line number'. 
                        // Let's stick to the request: "Removed Tests" logic uses parsed deleted content.
                        // The prompt says "Commit 6d8159d: This commit removes a test".
                        // So yes, we need removed lines.
                        // I'll update the interface implicitly here (and need to update types.ts).
                        // For now, I will modify `changedLines` to have an `isDeleted` flag?
                        // Or I realized typescript types are separate files. I should verify types.ts compatibility.
                        // `types.ts` has `lineNumber` and `content`.
                        // Ideally, I should update types.ts to have `deletedLines`.
                        // I will stick to adding all to `changedLines` but maybe use `lineNumber: -1` for deleted? 
                        // No, generic parser should just return what's there.

                        // Current Decision: Only add ADDED/MODIFIED lines to `changedLines` because those match the AST of the checking-out commit.
                        // For 'DEL' type files, we add lines to `changedLines` so we can parse them.
                        // For 'MOD' files, if a test is removed, we need the - lines to see "test(...)"
                        // So we DO need to capture - lines.
                        // I'll add `type: 'ADD' | 'DEL'` to changedLine ?
                        currentFile.changedLines.push({
                            lineNumber: -1, // Indicate it's a deleted line, not present in the new file
                            content: line.substring(1),
                            isDeleted: true // Add a flag for clarity
                        } as ChangedLine); // Cast to ChangedLine, assuming `isDeleted` will be added to type
                    }
                    currentHunk.currentOld++;
                } else if (char === ' ') {
                    // Context line
                    currentHunk.currentNew++;
                    currentHunk.currentOld++;
                } else if (char === '\\') {
                    // \ No newline at end of file
                }
            }
        }

        if (currentFile) files.push(currentFile);

        // Post-processing to fix paths for deleted files if needed
        // (If `diff --git a/foo b/foo` and mode is DEL, `filePath` was set to `foo`. Correct.)
        // If a file is deleted, its `filePath` should be the `a/path`.
        // The `diffGitRegex` captures `b/path` as `diffGitMatch[2]`.
        // We need to re-evaluate `filePath` for deleted files.
        for (const file of files) {
            if (file.changeType === 'DEL') {
                // Find the original diff --git line for this file to get a/path
                const originalDiffLine = lines.find(l => l.startsWith('diff --git') && l.includes(`b/${file.filePath}`));
                if (originalDiffLine) {
                    const match = originalDiffLine.match(diffGitRegex);
                    if (match && match[1]) { // match[1] is a/path
                        file.filePath = match[1];
                    }
                }
            }
        }

        return files;
    }
}
