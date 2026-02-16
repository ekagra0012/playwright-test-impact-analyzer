# Playwright Test Impact Analyzer

A CLI tool designed to optimize CI/CD pipelines by identifying the precise subset of Playwright tests impacted by git commits. This tool uses static analysis and git diffs to detect both direct and indirect dependencies.

## Installation

1. Clone the repository and navigate to the analyzer directory:
   ```bash
   git clone https://github.com/ekagra0012/playwright-test-impact-analyzer.git
   cd playwright-test-impact-analyzer/impact-analyzer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

The tool analyzes the impact of a specific commit within a git repository.

**Syntax:**
```bash
node dist/index.js --repo <path_to_repo> --commit <commit_sha> [options]
```

### CLI Command Examples

#### 1. Standard Output (Visual Report)
Generates a human-readable table listing all impacted tests and their status (Added, Modified, or Indirect Impact).

```bash
node dist/index.js --repo ./flash-tests --commit 75cdcc5
```

**Example Output:**
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

#### 2. JSON Output (CI/CD Integration)
Generates a structured JSON output, ideal for piping into other tools or CI pipelines. Use the `--json` flag.

```bash
node dist/index.js --repo ./flash-tests --commit 75cdcc5 --json
```

**Example Output:**
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



## Running Tests

To run the internal unit tests for the analyzer:

```bash
npm test
```
