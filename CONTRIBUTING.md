# Contributing to Playwright Test Impact Analyzer

Thank you for your interest in contributing! We welcome community contributions to make this tool better.

## Development Setup

1.  **Fork and Clone**
    ```bash
    git clone https://github.com/YOUR_USERNAME/playwright-test-impact-analyzer.git
    cd playwright-test-impact-analyzer/impact-analyzer
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

## Development Workflow

1.  Create a new branch for your feature or fix:
    ```bash
    git checkout -b feat/my-awesome-feature
    ```
2.  Implement your changes.
3.  Run tests to ensure no regressions:
    ```bash
    npm test
    ```
4.  Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/):
    ```bash
    git commit -m "feat: adding awesome feature"
    ```

## Pull Request Process

1.  Push your branch to GitHub.
2.  Open a Pull Request against the `main` branch.
3.  Ensure CI checks pass.
4.  A maintainer will review your PR.

## Code Style

- We use TypeScript.
- Prettier is used for formatting.
- ESLint is used for linting.
