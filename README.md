# Playwright Test Impact Analyzer

A tool to identify Playwright tests impacted by git commits, designed for the [Empirical AI Engineer Assignment](https://empirical.run/).

## 🚀 Setup & Usage

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/ekagra0012/playwright-test-impact-analyzer.git
cd playwright-test-impact-analyzer/impact-analyzer

# Install dependencies
npm install
```

### 2. Running the Analyzer

The tool is designed to work with the [flash-tests](https://github.com/empirical-run/flash-tests) repository.

**Command Syntax:**
```bash
node dist/index.js --commit <SHA> --repo <PATH_TO_FLASH_TESTS>
```

**Example:**
```bash
# Assuming you have flash-tests cloned in a sibling directory
# Build the project first
npm run build

# Run the analyzer
node dist/index.js --commit 75cdcc5 --repo ../flash-tests
```

### 3. Output Format

The tool provides a rich, color-coded CLI table output for easy reading:

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

You can also get the raw JSON output by passing the `--json` flag:

```bash
node dist/index.js --commit <SHA> --repo <PATH> --json
```

## 🧪 Testing

Run the included test suite to verify the logic:

```bash
npm test
```
