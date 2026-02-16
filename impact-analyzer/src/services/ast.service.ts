import { Project, SourceFile, SyntaxKind, Node, CallExpression, Identifier, ReferenceEntry } from 'ts-morph';
import * as path from 'path';
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
            // We need to load all files to find references globally
            skipAddingFilesFromTsConfig: false
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
                    if (args.length > 0) {
                        const firstArg = args[0];
                        let testName = '';

                        if (Node.isStringLiteral(firstArg)) {
                            testName = firstArg.getLiteralText();
                        } else if (Node.isNoSubstitutionTemplateLiteral(firstArg)) {
                            testName = firstArg.getLiteralText();
                        } else if (Node.isTemplateExpression(firstArg)) {
                            // Helper to get raw text of template expression for now
                            // e.g. `Login as ${user}` -> "Login as ${user}"
                            testName = firstArg.getText();
                            if (testName.startsWith('`') && testName.endsWith('`')) {
                                testName = testName.slice(1, -1);
                            }
                            // Note: We keep the backticks/syntax for template expressions to indicate it's dynamic
                        }

                        if (testName) {
                            tests.push({
                                testName,
                                startLine: node.getStartLineNumber(),
                                endLine: node.getEndLineNumber(),
                                sourceFile
                            });
                        }
                    }
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

        if (!foundNode) {
            // console.log(`  No symbol found at line ${lineNumber}`);
            return [];
        }

        // Traverse up to find the exported symbol if the found node is local
        let targetNode: Node | undefined = foundNode;
        while (targetNode && !Node.isSourceFile(targetNode)) {
            if (Node.isExportable(targetNode) && targetNode.isExported()) {
                break;
            }
            // Also check for class methods/properties which might not be explicitly exported but part of exported class
            if ((Node.isMethodDeclaration(targetNode) || Node.isPropertyDeclaration(targetNode)) &&
                targetNode.getParent() && Node.isClassDeclaration(targetNode.getParent()) &&
                (targetNode.getParent() as any).isExported()) {
                // If it's a method of an exported class, we can trace the method directly ??? 
                // Actually usage of Method is fine.
                break;
            }
            targetNode = targetNode.getParent();
        }

        if (!targetNode || Node.isSourceFile(targetNode)) {
            // console.log(`  Could not find exported parent for symbol at line ${lineNumber}`);
            return [];
        }

        // console.log(`  Found target exported symbol: ${targetNode.getKindName()} (${targetNode.getText().substring(0, 50)}...)`);

        // 2. Find references
        const impactedTests: TestDefinition[] = [];

        try {
            // Fix: ref is a Node in newer ts-morph versions (or depending on method used)
            // findReferencesAsNodes returns Node[]
            // Start recursive tracing
            this.traceReferences(targetNode, impactedTests, new Set<string>());

        } catch (error) {
            console.error('Error finding references:', error);
        }

        return impactedTests;
    }

    private traceReferences(node: Node, results: TestDefinition[], visited: Set<string>, depth: number = 0) {
        if (depth > 5) return; // Prevent infinite recursion

        // Unique identifier for the node to prevent cycles
        const file = node.getSourceFile().getFilePath();
        const start = node.getStart();
        const nodeId = `${file}:${start}`;

        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        // console.log(`  Tracing references for ${node.getKindName()} in ${path.basename(file)} (Depth: ${depth})`);

        const references = (node as any).findReferencesAsNodes ? (node as any).findReferencesAsNodes() : [];
        // if (references.length === 0) console.log(`    No references found.`);

        for (const ref of references) {
            const refSourceFile = ref.getSourceFile();
            const refPath = refSourceFile.getFilePath();
            // console.log(`    Found reference in: ${refPath} (Line: ${ref.getStartLineNumber()})`);

            // 1. If reference is in a spec file, find the test
            if (refPath.endsWith('.spec.ts')) {
                // Check if the reference is an import
                const refNode = ref;
                // console.log(`    Node kind: ${refNode.getKindName()}, Parent kind: ${refNode.getParent()?.getKindName()}`);

                // If the node is part of an import, we need to find where this import is used in the file
                // If refNode is Identifier, parent might be ImportSpecifier
                if (Node.isImportSpecifier(refNode) || Node.isImportClause(refNode.getParent()) ||
                    (refNode.getParent() && Node.isImportSpecifier(refNode.getParent()))) {
                    // console.log(`    Reference is an import at line ${refNode.getStartLineNumber()}. Finding usages in ${refPath}...`);
                    const importSpecifierPromise = Node.isImportSpecifier(refNode) ? refNode : refNode.getParent();
                    const importSpecifier = importSpecifierPromise as any; // Cast for now

                    const importNameNode = importSpecifier.getNameNode ? importSpecifier.getNameNode() : refNode;

                    // Find references of this import within the file
                    // Find references of this import within the file
                    const internalRefs = importNameNode.findReferencesAsNodes();

                    // We can recurse on the import identifier
                    for (const internalRef of internalRefs) {
                        if (internalRef.getSourceFile().getFilePath() !== refPath) continue;

                        const internalRefLine = internalRef.getStartLineNumber();

                        // Avoid self-reference (the import itself)
                        if (internalRefLine === refNode.getStartLineNumber()) continue;

                        const testDef = this.findEnclosingTest(internalRef);
                        if (testDef) {
                            results.push(testDef);
                        }
                    }
                } else {
                    // Direct usage in code (hopefully inside a test)
                    const testDef = this.findEnclosingTest(refNode);
                    if (testDef) {
                        results.push(testDef);
                    }
                }
            }
            // 2. If reference is in a helper file (not spec), recurse
            else if (refPath.endsWith('.ts')) {
                // We found a usage in another helper.
                // We need to find the ENCLOSING EXPORTED SYMBOL in that helper and trace it.
                const enclosingExport = this.findEnclosingExportedSymbol(ref);
                if (enclosingExport) {
                    this.traceReferences(enclosingExport, results, visited, depth + 1);
                }
            }
        }
    }

    private findEnclosingExportedSymbol(node: Node): Node | undefined {
        let current: Node | undefined = node;
        while (current && !Node.isSourceFile(current)) {
            if (Node.isExportable(current) && current.isExported()) {
                return current;
            }
            // Also check for class methods/properties
            if ((Node.isMethodDeclaration(current) || Node.isPropertyDeclaration(current)) &&
                current.getParent() && Node.isClassDeclaration(current.getParent()) &&
                (current.getParent() as any).isExported()) {
                return current; // Return method, trace references to method
            }
            current = current.getParent();
        }
        return undefined;
    }

    private findEnclosingTest(node: Node): TestDefinition | undefined {
        let current: Node | undefined = node.getParent();
        while (current) {
            if (Node.isCallExpression(current)) {
                if (this.isTestCall(current)) {
                    const args = current.getArguments();
                    if (args.length > 0) {
                        const firstArg = args[0];
                        let testName = '';
                        if (Node.isStringLiteral(firstArg)) {
                            testName = firstArg.getLiteralText();
                        } else if (Node.isNoSubstitutionTemplateLiteral(firstArg)) {
                            testName = firstArg.getLiteralText();
                        } else if (Node.isTemplateExpression(firstArg)) {
                            testName = firstArg.getText();
                            if (testName.startsWith('`') && testName.endsWith('`')) {
                                testName = testName.slice(1, -1);
                            }
                        }

                        if (testName) {
                            return {
                                testName,
                                startLine: current.getStartLineNumber(),
                                endLine: current.getEndLineNumber(),
                                sourceFile: current.getSourceFile()
                            };
                        }
                    }
                }
            }
            current = current.getParent();
        }
        return undefined;
    }
}
