
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_PATH = path.join(__dirname, 'flash-tests');
const DIST_PATH = path.join(__dirname, 'dist/index.js');

function getCommits() {
    try {
        const output = execSync('git log --format="%H" -n 500', { cwd: REPO_PATH, encoding: 'utf-8' });
        return output.split('\n').filter(line => line.trim().length > 0);
    } catch (e) {
        console.error("Error fetching commits:", e.message);
        process.exit(1);
    }
}

function getRandomCommits(commits, count) {
    const shuffled = commits.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function runTest(commitSha) {
    // Checkout the commit first to simulate the state of the repo at that time?
    // The tool uses `git diff <sha>...`, so it just needs the repo to be valid.
    // However, for AST analysis of "current" files, the tool analyzes the files *on disk*.
    // If we want accurate "impact at that point in time", we *should* checkout the commit.
    // BUT the tool might be designed to take a commit SHA and analyze diff vs parent.
    // If the file doesn't exist on disk (because we are on a different branch), AST analysis will fail or find nothing.
    // The `verify_all.sh` script does `git checkout <sha>`. So we should too.

    try {
        execSync(`git checkout ${commitSha}`, { cwd: REPO_PATH, stdio: 'ignore' });

        const cmd = `node ${DIST_PATH} --repo ${REPO_PATH} --commit ${commitSha} --json`;
        const start = Date.now();
        const jsonOutput = execSync(cmd, { encoding: 'utf-8' });
        const duration = Date.now() - start;

        const result = JSON.parse(jsonOutput);
        return {
            sha: commitSha,
            success: true,
            impactCount: result.impacted_tests.length,
            duration: duration
        };
    } catch (e) {
        return {
            sha: commitSha,
            success: false,
            error: e.message
        };
    }
}

async function main() {
    console.log("Fetching commits...");
    const allCommits = getCommits();
    console.log(`Found ${allCommits.length} commits.`);

    const randomCommits = getRandomCommits(allCommits, 20);
    console.log(`Selected 20 random commits for testing.\n`);

    console.log("--------------------------------------------------------------------------------");
    console.log("| Commit SHA | Status  | Impacted Tests | Duration (ms) | Check               |");
    console.log("|------------|---------|----------------|---------------|---------------------|");

    let successCount = 0;

    for (const commit of randomCommits) {
        const result = runTest(commit);
        if (result.success) {
            successCount++;
            const shortSha = result.sha.substring(0, 10);
            const status = "SUCCESS";
            const count = result.impactCount.toString().padEnd(14);
            const duration = result.duration.toString().padEnd(13);
            const check = result.impactCount > 0 ? "✅ Impact" : "⚠️ No Impact"; // Just a heuristic
            console.log(`| ${shortSha} | ${status} | ${count} | ${duration} | ${check} |`);
        } else {
            console.log(`| ${commit.substring(0, 10)} | FAILED  | -              | -             | ❌ Error            |`);
            // console.error(result.error); // Optional: verbose error
        }
    }

    console.log("--------------------------------------------------------------------------------");
    console.log(`\nTest Run Complete.`);
    console.log(`Success Rate: ${successCount}/20 (${(successCount / 20) * 100}%)`);

    // Restore repo to main
    try {
        execSync(`git checkout main`, { cwd: REPO_PATH, stdio: 'ignore' });
        console.log("Restored flash-tests to main branch.");
    } catch (e) {
        console.error("Failed to restore main branch.");
    }
}

main();
