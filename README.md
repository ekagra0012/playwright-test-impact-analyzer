# Playwright Test Impact Analyzer 🚀

A sophisticated CLI tool designed to optimize CI/CD pipelines by identifying the precise subset of Playwright tests impacted by git commits. This tool leverages **Static Analysis (AST)** and **Git Diffs** to detect both direct and indirect dependencies, ensuring zero wasted compute time.

---

## 🏗️ How It Works

The analyzer operates in three stages to guarantee accuracy:

1.  **Git Analysis**: Parses `git diff` to identify every changed file and line in a commit.
2.  **AST Parsing**: Builds an Abstract Syntax Tree using `ts-morph` to understand the code structure (tests, describe blocks, helper functions).
3.  **Dependency Tracing**: Recursively traces changes in helper files (e.g., Page Objects, utilities) to find every test that relies on the modified code.

---

## ⚡️ Quick Start

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/ekagra0012/playwright-test-impact-analyzer.git
cd playwright-test-impact-analyzer/impact-analyzer

# Install dependencies
npm install

# Build the project (Required)
npm run build
```

### 2. Basic Usage

Run the analyzer against any local Playwright repository. You need to provide the **Path to the Repo** and the **Commit SHA**.

```bash
node dist/index.js --repo <path_to_repo> --commit <commit_sha>
```

> **Note:** The repository at `<path_to_repo>` must be a valid git repository with Playwright tests.

---

## 🛠️ CLI Command Examples

Here are the common scenarios you will use:

### Scenario A: Human-Readable Report (Default)
Best for local debugging or verifying what tests *would* run.

```bash
# Example running against a sibling directory 'flash-tests'
node dist/index.js --repo ../flash-tests --commit 75cdcc5
```

**Output:**
```text
IMPACT ANALYSIS REPORT
Commit: 75cdcc5

+------------------+------------------------------+--------------------------+
| Status           | Test Name                    | File                     |
+------------------+------------------------------+--------------------------+
| ADDED            | safeBash tool execution      | tests/tool-execution/... |
| MODIFIED         | Login flow                   | tests/auth/login.spec.ts |
| INDIRECT IMPACT  | User Profile Update          | tests/profile.spec.ts    |
+------------------+------------------------------+--------------------------+

Total Impacted: 3
```

### Scenario B: CI/CD Integration (JSON Output)
Use the `--json` flag to pipe the output into your CI runner (e.g., GitHub Actions, Jenkins) to dynamically filter tests.

```bash
node dist/index.js --repo ../flash-tests --commit 75cdcc5 --json
```

**Output:**
```json
{
  "commit": "75cdcc5",
  "impacted_tests": [
    {
      "testName": "safeBash tool execution",
      "filePath": "tests/tool-execution/session.spec.ts",
      "impactType": "ADDED"
    }
  ]
}
```

---

## ✅ Verification & Robustness

The tool includes a verification script that tests against **real commits** from the `flash-tests` repository to prove correctness across different scenarios.

To run the verification suite:

```bash
# 1. Ensure you have the 'flash-tests' submodule initialized
cd impact-analyzer
git submodule update --init --recursive

# 2. Run the verification script
./verify_all.sh
```

This script validates:
- [x] **Added Tests**: Correctly identifies new test blocks.
- [x] **Modified Tests**: Detects changes within existing tests.
- [x] **Deleted Tests**: Finds tests removed in a commit.
- [x] **Indirect Impact**: Traces changes in helper files (Page Objects) to the tests that import them.
- [x] **Global Config**: Flags "ALL TESTS" if `playwright.config.ts` or `package.json` changes.

---

## 🧪 Running Unit Tests

The project itself is fully tested. To run the internal unit tests:

```bash
npm test
```
