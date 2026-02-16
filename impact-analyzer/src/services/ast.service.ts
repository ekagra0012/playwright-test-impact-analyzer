import { Project, SourceFile, SyntaxKind, Node, CallExpression, Identifier } from 'ts-morph';
import { ChangeType } from '../types';

export interface TestDefinition {
    testName: string;
    startLine: number;
    endLine: number;
    sourceFile: SourceFile;
}

export class AstService {
    private project: Project;

    constructor(tsConfigPath: string) {
        this.project = new Project({
            tsConfigFilePath: tsConfigPath,
            skipAddingFilesFromTsConfig: true // Lazy load for performance
        });
    }

    // Load a file into the project
    addFile(filePath: string) {
        if (!this.project.getSourceFile(filePath)) {
            try {
                this.project.addSourceFileAtPath(filePath);
            } catch (e) {
                // Ignore if file doesn't exist (e.g. deleted) or path issue
                console.warn(`Could not add file ${filePath}:`, e);
            }
        }
    }

    getTestRanges(filePath: string): TestDefinition[] {
        const sourceFile = this.project.getSourceFile(filePath);
        if (!sourceFile) return [];

        const tests: TestDefinition[] = [];

        // Recursive function to find test blocks
        const findTests = (node: Node) => {
            if (Node.isCallExpression(node)) {
                if (this.isTestCall(node)) {
                    const args = node.getArguments();
                    if (args.length > 0 && Node.isStringLiteral(args[0])) {
                        const testName = args[0].getLiteralText();
                        tests.push({
                            testName,
                            startLine: node.getStartLineNumber(),
                            endLine: node.getEndLineNumber(),
                            sourceFile
                        });
                    }
                    // describe blocks?
                    // if it's a describe block, we recurse into it, but we might want individual tests.
                }
            }
            node.forEachChild(findTests);
        };

        sourceFile.forEachChild(findTests);
        return tests;
    }

    private isTestCall(node: CallExpression): boolean {
        // Simple check for 'test(...)' or 'test.describe(...)' 
        // A robust check would verify imports from @playwright/test
        const expr = node.getExpression();
        let text = expr.getText();

        // Handle test('name', ...)
        if (text === 'test') return true;
        // Handle test.only, test.skip, test.describe
        if (text.startsWith('test.')) return true;

        return false;
    }

    // Trace references for indirect impacts
    getImpactedTestsFromSymbolAtLine(filePath: string, lineNumber: number): TestDefinition[] {
        const sourceFile = this.project.getSourceFile(filePath);
        if (!sourceFile) return [];

        // 1. Find the symbol at the line
        // We look for statements/declarations that contain this line
        // ts-morph line numbers are 1-indexed

        // Find the specific node at the line?
        // Let's traverse children to find the smallest node containing the line
        // Or just find top-level exports?
        // Heuristic: Find declared symbol (Function, Class, Variable) at this line.

        let foundNode: Node | undefined;

        const findNode = (node: Node) => {
            const start = node.getStartLineNumber();
            const end = node.getEndLineNumber();

            if (lineNumber >= start && lineNumber <= end) {
                // If it's a named declaration, this is a candidate
                if (Node.isFunctionDeclaration(node) ||
                    Node.isMethodDeclaration(node) ||
                    Node.isClassDeclaration(node) ||
                    Node.isVariableDeclaration(node)) {
                    foundNode = node;
                }
                node.forEachChild(findNode);
            }
        };

        sourceFile.forEachChild(findNode);

        if (!foundNode) return [];

        // 2. Find references
        const impactedTests: TestDefinition[] = [];

        try {
            const references = (foundNode as any).findReferencesAsNodes ? (foundNode as any).findReferencesAsNodes() : [];

            for (const ref of references) {
                const refSourceFile = ref.getSourceFile();
                const refPath = refSourceFile.getFilePath();

                // We only care if reference is in a spec file
                if (refPath.endsWith('.spec.ts')) {
                    // Find which test block contains this reference
                    const testBlock = this.findEnclosingTest(ref);
                    if (testBlock) {
                        impactedTests.push(testBlock);
                    }
                }
            }
        } catch (e) {
            // finding references can fail if project not fully loaded
            console.warn('Error finding references:', e);
        }

        return impactedTests;
    }

    private findEnclosingTest(node: Node): TestDefinition | undefined {
        let current = node.getParent();
        while (current) {
            if (Node.isCallExpression(current)) {
                if (this.isTestCall(current)) {
                    const args = current.getArguments();
                    if (args.length > 0 && Node.isStringLiteral(args[0])) {
                        return {
                            testName: args[0].getLiteralText(),
                            startLine: current.getStartLineNumber(),
                            endLine: current.getEndLineNumber(),
                            sourceFile: current.getSourceFile()
                        };
                    }
                }
            }
            current = current.getParent();
        }
        return undefined;
    }
}
