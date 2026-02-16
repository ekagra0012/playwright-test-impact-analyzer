# Demo Script: Playwright Test Impact Analyzer

This script guides you through demonstrating the Test Impact Analysis (TIA) tool.

## Setup
1. Open your terminal to the `impact-analyzer` directory.
2. Run the automated setup script: `./setup.sh` (this handles `npm install`, build, and cloning `flash-tests`).

## Scene 1: Introduction
"Hi, I'm going to demonstrate a custom Test Impact Analysis tool for Playwright. This tool analyzes git commits to determine exactly which tests need to be run, saving time in CI/CD pipelines."

## Scene 2: Direct Impact (Added/Modified Tests)
"First, let's look at a commit where a test was simply added."

**Action**: Run command
```bash
node dist/index.js --repo ./flash-tests --commit 75cdcc5
```

**Talking Point**: 
"As you can see, the tool correctly identifies that 'safeBash tool execution...' was ADDED. It also detects that the 'Tool Execution Tests' describe block was modified."

## Scene 3: Modified Tests
"Now, let's look at a commit where existing tests were modified."

**Action**: Run command
```bash
node dist/index.js --repo ./flash-tests --commit 5df7e4d
```

**Talking Point**:
"Here, it identifies 3 modified tests in `sessions.spec.ts`. The tool parses the diff and maps the changed lines to the specific test blocks."

## Scene 4: Removed Tests
"What happens if a test is deleted? We need to know so we don't try to run it (or to report it)."

**Action**: Run command
```bash
node dist/index.js --repo ./flash-tests --commit 6d8159d
```

**Talking Point**:
"The tool detects that 'Sort sessions by title' was REMOVED. It does this by parsing the deleted lines in the git diff."

## Scene 5: Indirect Impact (The Cool Part)
"This is the most powerful feature. What if I modify a helper function in a Page Object? Use `git diff`, and you won't see any changes in `.spec.ts` files. But our tool traces the dependency."

**Action**: Run command
```bash
node dist/index.js --repo ./flash-tests --commit 45433fd
```

**Talking Point**:
"In this commit, `tests/pages/test-runs.ts` was modified. The tool found that `goToTestRun` function changed. It then traced all usages of this function across the codebase and identified 5 tests that depend on it. These are marked as 'INDIRECT IMPACT'."

## Scene 6: JSON Output for CI
"Finally, for CI integration, we can output JSON."

**Action**: Run command
```bash
node dist/index.js --repo ./flash-tests --commit 45433fd --json
```

**Talking Point**:
"This structured output can be piped into a test runner to selectively run only the impacted tests."

## Scene 7: Transparent AI Usage (+100 Points)
"I heavily utilized AI (specifically Google's Gemini/DeepMind models in Agentic Mode) to build this tool efficiently."

**Process**:
1.  **Planning**: I fed the `Blueprint.md` and Assignment requirements to the AI. It generated a detailed `task.md` and execution plan.
2.  **Coding**: The AI scaffolded the initial project structure, implemented the `GitService` and `AstService` core logic, and handled complex regex for diff parsing.
3.  **Refining**: When I needed a better CLI output, I asked the AI to integrate `cli-table3`, which it did seamlessly.
4.  **Verification**: The AI wrote the `verify_all.sh` regression script and `edge_cases.spec.ts` to ensure robustness, catching edge cases like template literals in test names.

**Value**: AI acted as a pair programmer, accelerating boilerplate setup and handling the intricate AST traversal logic, allowing me to focus on the architectural decisions and edge cases.
