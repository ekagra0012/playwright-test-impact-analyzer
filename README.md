# Playwright Test Impact Analyzer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-Test-green.svg)](https://playwright.dev/)

An intelligent tool designed to optimize CI/CD pipelines by identifying the exact Playwright tests impacted by code changes. Instead of running the entire test suite for every commit, this analyzer determines the minimal set of tests required to validate changes, significantly reducing feedback loops and compute costs.

## 🚀 Features

- **Precision Impact Analysis**: Detects tests directly impacted by changes in test files.
- **Dependency Tracing**: Identifies tests indirectly affected through modifications in helper methods and shared utilities.
- **Smart Git Integration**: Analyze impact from any commit SHA, supporting both local and remote repository analysis.
- **CLI Interface**: Simple, scriptable command-line interface for easy integration into CI workflows.
- **Performance**: Optimized to process commits in seconds, even for large codebases.

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/test-impact-analyzer.git
cd test-impact-analyzer/impact-analyzer

# Install dependencies
npm install
```

## 🛠️ Usage

### Basic Analysis
Analyze the impact of a specific commit in a local repository:

```bash
npx impact-analyzer --commit <COMMIT_SHA> --repo <PATH_TO_REPO>
```

### Example
```bash
npx impact-analyzer --commit 75cdcc5 --repo ./flash-tests
```

### Output
The tool provides a structured report of impacted tests:

```json
{
  "impacted_tests": [
    {
      "test_name": "safeBash tool execution",
      "file": "tests/tool-execution/session.spec.ts",
      "reason": "Direct modification"
    },
    {
      "test_name": "Login flow",
      "file": "tests/auth/login.spec.ts",
      "reason": "Dependency change: tests/pages/auth-helper.ts"
    }
  ],
  "summary": {
    "total_impacted": 2,
    "source_files_changed": 3
  }
}
```

## 🏗️ Architecture

The analyzer works by:
1.  **Diff Analysis**: Parsing the git diff to identify changed files and lines.
2.  **AST Parsing**: Constructing an Abstract Syntax Tree (AST) of the codebase to understand test structure and imports.
3.  **Dependency Graphing**: Building a dependency graph to trace how changes propagate from helpers to tests.
4.  **Intersection**: Mapping changed code regions to specific test definitions.

## 🤝 Contributing

Contributions are welcome! Please read our CONTRIBUTING.md for details on our code of conduct, and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
