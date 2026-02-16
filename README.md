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
npx ts-node src/index.ts --commit <SHA> --repo <PATH_TO_FLASH_TESTS>
```

**Example:**
```bash
# Assuming you have flash-tests cloned in a sibling directory
npx ts-node src/index.ts --commit 75cdcc5 --repo ../flash-tests
```

### 3. Output Format

The tool provides a JSON-structured output listing impacted tests:

```json
{
  "impacted_tests": [
    {
      "test_name": "safeBash tool execution",
      "file": "tests/tool-execution/session.spec.ts",
      "change_type": "added"
    }
  ]
}
```

## 🧪 Testing

Run the included test suite to verify the logic:

```bash
npm test
```
