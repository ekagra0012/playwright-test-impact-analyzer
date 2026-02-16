#!/usr/bin/env node
import { Command } from 'commander';
import { GitService } from './services/git.service';
import { AstService } from './services/ast.service';
import { AnalyzerService } from './services/analyzer.service';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';

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
                console.warn(chalk.yellow('Warning: tsconfig.json not found in repo root. AST analysis might be limited.'));
            }

            const astService = new AstService(tsConfigPath);
            const analyzer = new AnalyzerService(gitService, astService, repoPath);

            const startTime = Date.now();
            const results = await analyzer.analyze(commitSha);
            const duration = Date.now() - startTime;

            if (options.json) {
                console.log(JSON.stringify({
                    commit: commitSha,
                    repo: repoPath,
                    durationMs: duration,
                    impacted_tests: results
                }, null, 2));
            } else {
                console.log(chalk.bold(`\nAnalyze Impact for Commit: ${chalk.cyan(commitSha)}`));
                console.log(`Repository: ${repoPath}`);
                console.log(`Time: ${duration}ms`);
                console.log(chalk.bold('\nImpacted Tests:'));

                if (results.length === 0) {
                    console.log(chalk.green('No impacted tests found.'));
                } else {
                    const byType = {
                        ADDED: results.filter(r => r.impactType === 'ADDED'),
                        MODIFIED: results.filter(r => r.impactType === 'MODIFIED'),
                        REMOVED: results.filter(r => r.impactType === 'REMOVED'),
                        IMPACTED_BY_DEPENDENCY: results.filter(r => r.impactType === 'IMPACTED_BY_DEPENDENCY')
                    };

                    if (byType.ADDED.length > 0) {
                        console.log(chalk.green(`\n[ADDED] (${byType.ADDED.length})`));
                        byType.ADDED.forEach(t => console.log(`  + ${t.testName} (${chalk.gray(t.filePath)})`));
                    }
                    if (byType.MODIFIED.length > 0) {
                        console.log(chalk.yellow(`\n[MODIFIED] (${byType.MODIFIED.length})`));
                        byType.MODIFIED.forEach(t => console.log(`  ~ ${t.testName} (${chalk.gray(t.filePath)})`));
                    }
                    if (byType.REMOVED.length > 0) {
                        console.log(chalk.red(`\n[REMOVED] (${byType.REMOVED.length})`));
                        byType.REMOVED.forEach(t => console.log(`  - ${t.testName} (${chalk.gray(t.filePath)})`));
                    }
                    if (byType.IMPACTED_BY_DEPENDENCY.length > 0) {
                        console.log(chalk.magenta(`\n[INDIRECT IMPACT] (${byType.IMPACTED_BY_DEPENDENCY.length})`));
                        byType.IMPACTED_BY_DEPENDENCY.forEach(t => console.log(`  * ${t.testName} (${chalk.gray(t.filePath)}) via ${chalk.italic(path.relative(repoPath, t.relatedFile || ''))}`));
                    }
                }
            }
        } catch (error: any) {
            console.error(chalk.red('Error during analysis:'), error.message);
            // console.error(error.stack);
            process.exit(1);
        }
    });

program.parse(process.argv);
