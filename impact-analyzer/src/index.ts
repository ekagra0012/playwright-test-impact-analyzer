#!/usr/bin/env node
import { Command } from 'commander';
import { GitService } from './services/git.service';
import { AstService } from './services/ast.service';
import { AnalyzerService } from './services/analyzer.service';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';

import Table from 'cli-table3';

const program = new Command();

program
    .name('empirical-tia')
    .description('Test Impact Analyzer for Playwright repositories')
    .version('1.0.0')
    .requiredOption('--repo <path>', 'Path to the git repository')
    .requiredOption('--commit <sha>', 'Commit SHA to analyze')
    .option('--json', 'Output results in JSON format')
    .action(async (options) => {
        const repoPath = path.resolve(options.repo);
        const commitSha = options.commit;

        if (!fs.existsSync(repoPath)) {
            console.error(chalk.red(`Error: Repository path does not exist: ${repoPath}`));
            process.exit(1);
        }

        try {
            // Initialize Services
            const gitService = new GitService(repoPath);

            // Look for tsconfig.json in repo, otherwise use default?
            // ts-morph needs a tsconfig to understand project structure (aliases etc)
            const tsConfigPath = path.join(repoPath, 'tsconfig.json');
            if (!fs.existsSync(tsConfigPath)) {
                // console.warn(chalk.yellow('Warning: tsconfig.json not found in repo root. AST analysis might be limited.'));
            }

            const astService = new AstService(tsConfigPath);
            const analyzer = new AnalyzerService(gitService, astService, repoPath);

            const startTime = Date.now();
            const results = await analyzer.analyze(commitSha, !!options.json);
            const duration = Date.now() - startTime;

            if (options.json) {
                console.log(JSON.stringify({
                    commit: commitSha,
                    repo: repoPath,
                    durationMs: duration,
                    impacted_tests: results
                }, null, 2));
            } else {
                console.log(chalk.bold(`\nIMPACT ANALYSIS REPORT`));
                console.log(`Commit: ${chalk.cyan(commitSha)}\n`);

                const table = new Table({
                    head: [chalk.white('Status'), chalk.white('Test Name'), chalk.white('File')],
                    colWidths: [20, 60, 50],
                    wordWrap: true
                });

                results.forEach(result => {
                    let status = '';
                    let colorFn = (s: string) => s;

                    switch (result.impactType) {
                        case 'ADDED':
                            status = 'ADDED';
                            colorFn = chalk.green;
                            break;
                        case 'MODIFIED':
                            status = 'MODIFIED';
                            colorFn = chalk.yellow;
                            break;
                        case 'REMOVED':
                            status = 'REMOVED';
                            colorFn = chalk.red;
                            break;
                        case 'IMPACTED_BY_DEPENDENCY':
                            status = 'INDIRECT IMPACT';
                            colorFn = chalk.magenta;
                            break;
                    }

                    const filePathDisplay = result.filePath + (result.relatedFile ? `\n(via ${path.relative(repoPath, result.relatedFile)})` : '');

                    table.push([
                        colorFn(status),
                        colorFn(result.testName),
                        chalk.gray(filePathDisplay)
                    ]);
                });

                console.log(table.toString());
                console.log(chalk.bold(`\nTotal Impacted: ${results.length}`));
            }
        } catch (error: any) {
            console.error(chalk.red('Error during analysis:'), error.message);
            // console.error(error.stack);
            process.exit(1);
        }
    });

program.parse(process.argv);
