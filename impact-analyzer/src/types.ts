export type ChangeType = 'ADD' | 'MOD' | 'DEL';

export interface ChangedLine {
    lineNumber: number; // The new line number (for ADD/MOD) or old line number (for DEL)
    content: string;
    isDeleted?: boolean;
}

export interface FileDiff {
    filePath: string;
    changeType: ChangeType;
    // For ADD/MOD, these are lines in the NEW file.
    // For DEL, these are lines from the OLD file (captured from diff).
    changedLines: ChangedLine[];
    // Hunks are useful for range matching
    hunks: {
        oldStart: number;
        oldLines: number;
        newStart: number;
        newLines: number;
        content: string; // The diff content of the hunk
    }[];
}

export interface ImpactedTest {
    testName: string;
    filePath: string;
    impactType: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'IMPACTED_BY_DEPENDENCY';
    relatedFile?: string; // The file that caused the impact (for indirect)
}
