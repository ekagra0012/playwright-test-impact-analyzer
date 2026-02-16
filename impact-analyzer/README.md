# Playwright Test Impact Analyzer

A sophisticated CLI tool designed to optimize CI/CD pipelines by identifying the precise subset of Playwright tests impacted by git commits. This tool leverages static analysis (AST) and git diffs to detect both direct and indirect dependencies, ensuring that you only run the tests that matter.

## 🚀 Key Features

- **Direct Impact Analysis**: Instantly detects tests that have been modified or added within `.spec.ts` files.
- **Indirect Impact Analysis**: intelligent dependency tracing. If a helper function in a Page Object or utility file is modified, the tool recursively traces all usages of that function to find the tests that depend on it.
- **Removed Test Detection**: Identifies tests that were deleted in a commit, preventing "test not found" errors in valid CI runs.
- **Global Configuration Awareness**: Automatically flags all tests as impacted if global configuration files (e.g., `playwright.config.ts`, `package.json`) are modified.
- **CI/CD Ready**: Produces structured JSON output for easy integration with test runners.

## 🏗️ Architecture

The tool operates in three stages:

1.  **Git Analysis**: Uses `git diff` to identify changed files and specific lines associated with a commit.
2.  **AST Parsing**: Uses `ts-morph` to build an Abstract Syntax Tree of the codebase. It maps test definitions to line numbers and builds a dependency graph for helper functions.
3.  **Impact Intersection**: intersects the git changes with the AST to determine which tests are affected.

## 📦 Installation

Prerequisites: Node.js (v14+ recommended) and `npm`.

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd impact-analyzer
    ```

2.  **Run the setup script**:
    ```bash
    ./setup.sh
    ```
    This script will install dependencies, build the project, and clone the demo `flash-tests` repository for you.

## 🛠️ Usage

The tool requires a path to a git repository and a commit SHA to analyze.

```bash
node dist/index.js --repo <path-to-target-repo> --commit <commit-sha> [options]
```

### Options

| Option | Description | Required |
|--------|-------------|----------|
| `--repo` | Absolute or relative path to the git repository containing the Playwright tests. | Yes |
| `--commit` | The Commit SHA to analyze. | Yes |
| `--json` | Output the results in JSON format (ideal for piping to other tools). | No |

### Examples

**Analyze a specific commit (Default Table Output):**
```bash
node dist/index.js --repo ./flash-tests --commit 45433fd

# Output:
# IMPACT ANALYSIS REPORT
# Commit: 45433fd
# ┌──────────────────────┬───────────────────────────────────────────────────┬──────────────────────────┐
# │ Status               │ Test Name                                         │ File                     │
# ├──────────────────────┼───────────────────────────────────────────────────┼──────────────────────────┤
# │ INDIRECT IMPACT      │ set human triage for failed test                  │ tests/test-runs.spec.ts  │
# │                      │                                                   │ (via pages/test-runs.ts) │
# └──────────────────────┴───────────────────────────────────────────────────┴──────────────────────────┘
```

**Get JSON output for CI integration:**
```bash
node dist/index.js --repo ./flash-tests --commit 45433fd --json

# Output:
# {
#   "commit": "45433fd",
#   "impacted_tests": [ ... ]
# }
```

## ✅ Verification

We have provided a scripted verification suite to ensure the tool correctly identifies various impact types.

To run the verification:
```bash
./verify_all.sh
```

This script will run the tool against specific commits in the `flash-tests` submodule that demonstrate:
1.  **Added Tests** (Commit `75cdcc5`)
2.  **Modified Tests** (Commit `5df7e4d`)
3.  **Removed Tests** (Commit `6d8159d`)
4.  **Indirect Impacts** (Commit `45433fd` - modifying a helper function)
5.  **Global Config Changes** (Commit `579c350`)

## 📂 Project Structure

```
impact-analyzer/
├── src/
│   ├── index.ts              # CLI Entry Point
│   ├── services/
│   │   ├── analyzer.service.ts # Core logic combining Git and AST
│   │   ├── ast.service.ts      # Static Analysis service (ts-morph)
│   │   └── git.service.ts      # Git operations service
│   └── types/                # Shared TypeScript interfaces
├── flash-tests/              # Submodule/Folder containing the target test repo for verification
├── verify_all.sh             # Verification script
└── README.md                 # This documentation
```

## 🤝 Contributing

Contributions are welcome! Please ensure any changes are verified using the `verify_all.sh` script before submitting a Pull Request.
