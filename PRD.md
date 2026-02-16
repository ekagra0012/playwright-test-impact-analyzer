# Product Requirements Document (PRD)

## 1. Product Overview
- **Project Title**: Playwright Test Impact Analyzer
- **Version**: 1.0
- **Last Updated**: February 16, 2026
- **Owner**: AI Engineer Candidate for Empirical

## 2. Problem Statement
When AI agents generate or modify Playwright tests in repositories with hundreds or thousands of tests, reviewers need to quickly identify which tests were impacted by code changes. Running the entire test suite is time-consuming and inefficient. There's currently no automated way to determine the exact scope of impact from a commit, including direct test modifications and indirect impacts through shared helper methods.

## 3. Goals & Objectives

### Business Goals
- **Reduce review time by 80%**: Enable instant identification of impacted tests instead of manual code inspection
- **Decrease unnecessary test runs by 70%**: Run only impacted tests instead of full test suites
- **Improve code review accuracy**: Ensure no impacted tests are missed during review

### User Goals
- Quickly identify all tests affected by a commit
- Understand the type of impact (added/modified/removed)
- Trace indirect impacts through helper method modifications
- Validate AI-generated code changes efficiently

## 4. Success Metrics
- **Accuracy**: 95%+ accuracy in identifying impacted tests
- **Performance**: Process any commit in under 5 seconds
- **Coverage**: Detect both direct test changes and indirect impacts through helper methods
- **Adoption**: Tool becomes part of standard code review workflow within 2 weeks

## 5. Target Users & Personas

### Primary Persona: Engineering Team Lead (Arjun)
- **Demographics**: Technical founder/CEO, hands-on developer
- **Pain Points**: 
  - Needs to review AI-generated code changes quickly
  - Must ensure test coverage is maintained
  - Limited time for deep code inspection
- **Goals**: Fast, accurate impact assessment for every commit
- **Technical Proficiency**: Expert-level (builds agentic systems)

### Secondary Persona: QA Engineer
- **Demographics**: Quality assurance engineer managing test suites
- **Pain Points**:
  - Unclear which tests to run after code changes
  - Time wasted running full test suites
  - Difficulty tracking test coverage
- **Goals**: Identify minimum set of tests needed to validate changes
- **Technical Proficiency**: Intermediate (comfortable with git and testing tools)

## 6. Features & Requirements

### Must-Have Features (P0)

1. **Commit SHA Input**
   - Description: Accept a commit SHA from the flash-tests repository as input
   - User Story: As a reviewer, I want to input a commit SHA so that I can analyze its impact
   - Acceptance Criteria:
     - [ ] Accept any valid commit SHA from flash-tests repo (~500 commits)
     - [ ] Validate commit SHA exists before processing
     - [ ] Support short (7-char) and full SHA formats
   - Success Metric: 100% of valid commits processable

2. **Direct Test Change Detection**
   - Description: Identify tests that were directly added, modified, or removed in the commit
   - User Story: As a reviewer, I want to see which tests were directly changed so that I know what to validate
   - Acceptance Criteria:
     - [ ] Detect new test additions with test name and file path
     - [ ] Detect test modifications with test name and file path
     - [ ] Detect test removals with test name and file path
     - [ ] Parse Playwright test syntax (test(), test.describe())
   - Success Metric: 100% accuracy on direct changes

3. **Indirect Impact Detection**
   - Description: Identify tests affected by helper method modifications
   - User Story: As a reviewer, I want to see which tests use modified helper methods so that I can validate cascading impacts
   - Acceptance Criteria:
     - [ ] Detect when helper methods/functions are modified
     - [ ] Trace which test files import modified helpers
     - [ ] Identify specific tests using those helpers
     - [ ] Show full dependency chain
   - Success Metric: Detect all transitive dependencies

4. **Structured Output**
   - Description: Present impact analysis in clear, actionable format
   - User Story: As a reviewer, I want to see organized output so that I can quickly understand the scope
   - Acceptance Criteria:
     - [ ] Group by impact type (added/modified/removed)
     - [ ] Show test names and file paths
     - [ ] Display count of impacted tests
     - [ ] Include context about helper method changes
   - Success Metric: Output readable in under 10 seconds

5. **CLI Interface**
   - Description: Command-line tool for easy integration
   - User Story: As a developer, I want to run the tool from terminal so that it fits my workflow
   - Acceptance Criteria:
     - [ ] Simple command structure: `npx tool --commit <sha> --repo <path>`
     - [ ] Clear error messages for invalid inputs
     - [ ] Exit codes for automation (0=success, 1=error)
     - [ ] Help text with usage examples
   - Success Metric: Run successfully on first attempt

### Should-Have Features (P1)

1. **GitHub Integration**
   - Description: Fetch commit data directly from GitHub without local repo
   - User Story: As a remote reviewer, I want to analyze commits without cloning the repo
   - Acceptance Criteria:
     - [ ] Accept GitHub personal access token
     - [ ] Fetch commit diff via GitHub API
     - [ ] Parse changes without local filesystem
   - Success Metric: Works with GitHub token only

2. **Batch Processing**
   - Description: Analyze multiple commits at once
   - User Story: As a reviewer, I want to analyze a range of commits so that I can review PRs faster
   - Acceptance Criteria:
     - [ ] Accept commit range (e.g., main..feature-branch)
     - [ ] Output aggregated impact report
   - Success Metric: Process 10 commits in under 30 seconds

### Nice-to-Have Features (P2)

1. **Visual Dependency Graph**
   - Description: Show visual representation of test dependencies
   - User Story: As a reviewer, I want to see a dependency diagram so that I can understand complex impacts

2. **Historical Impact Trends**
   - Description: Track which tests are most frequently impacted
   - User Story: As a team lead, I want to see impact patterns so that I can identify brittle tests

## 7. Explicitly OUT OF SCOPE
- Executing the tests (only identifies them, doesn't run them)
- Test quality assessment or code review
- Support for non-Playwright test frameworks
- Real-time monitoring or webhook integration
- Web UI or dashboard
- Support for repositories other than Playwright-based projects
- Automated test generation or fixing
- Integration with CI/CD platforms (v1.0)
- Multi-repository analysis
- Authentication/authorization systems

## 8. User Scenarios

### Scenario 1: New Test Addition
- **Context**: AI agent added a new test for "safeBash tool execution"
- **Steps**:
  1. Reviewer runs: `npx impact-analyzer --commit 75cdcc5 --repo ./flash-tests`
  2. Tool parses commit diff
  3. Tool detects new test block in session.spec.ts
  4. Tool outputs: "1 test added: 'safeBash tool execution to get commit SHA' in tests/tool-execution/session.spec.ts"
- **Expected Outcome**: Reviewer knows exactly which test was added
- **Edge Cases**: Test added in new file vs existing file

### Scenario 2: Helper Method Modification
- **Context**: AI agent modified a helper method used by multiple tests
- **Steps**:
  1. Reviewer runs: `npx impact-analyzer --commit 45433fd --repo ./flash-tests`
  2. Tool detects change in tests/pages/test-runs.ts
  3. Tool finds all imports of this file
  4. Tool identifies 4 tests using modified helper
  5. Tool outputs list of all 4 impacted tests
- **Expected Outcome**: Reviewer knows all tests that need validation
- **Edge Cases**: Circular imports, unused imports, multiple helpers modified

### Scenario 3: Test Removal
- **Context**: AI agent removed an obsolete test
- **Steps**:
  1. Reviewer runs: `npx impact-analyzer --commit 6d8159d --repo ./flash-tests`
  2. Tool detects deleted test block
  3. Tool outputs: "1 test removed: 'Sort sessions by title' in tests/sessions.spec.ts"
- **Expected Outcome**: Reviewer confirms test removal was intentional
- **Edge Cases**: Entire file deleted vs single test deleted

## 9. Dependencies & Constraints

**Technical Constraints**:
- Must work with TypeScript/JavaScript Playwright repos
- Requires local git repository OR GitHub API access
- Must parse Playwright test syntax correctly
- Node.js environment required

**Business Constraints**:
- Must complete assignment in reasonable time (2-3 days)
- Solution must be demonstrable via Loom video
- Code must be production-quality

**External Dependencies**:
- flash-tests repository (https://github.com/empirical-run/flash-tests)
- Git command-line tools OR GitHub API
- Node.js runtime

## 10. Timeline & Milestones

- **MVP**: February 18, 2026 (48 hours from assignment receipt)
  - Core impact detection (direct changes)
  - CLI interface
  - Works with local repository
  - Clear output format

- **V1.0**: Same as MVP for assignment submission
  - Add indirect impact detection
  - Polish output formatting
  - Comprehensive error handling

## 11. Risks & Assumptions

### Risks
- **Complex Playwright syntax**: Mitigation = Use AST parsing library
- **Performance on large repos**: Mitigation = Cache parsed file trees
- **Transitive dependency tracking**: Mitigation = Build import graph incrementally

### Assumptions
- Commits follow standard Playwright test patterns
- Test files use standard imports (no dynamic requires)
- Helper methods are in separate files (not inline)
- Repository structure follows Playwright conventions

## 12. Non-Functional Requirements

- **Performance**: Process any commit in < 5 seconds
- **Security**: No execution of arbitrary code, read-only file access
- **Accessibility**: Clear terminal output, screen-reader friendly
- **Scalability**: Handle repos with 1000+ tests

## 13. References & Resources
- Flash-tests repo: https://github.com/empirical-run/flash-tests
- Playwright docs: https://playwright.dev
- Example commit 75cdcc5: https://github.com/empirical-run/flash-tests/commit/75cdcc5
- Example commit 45433fd: https://github.com/empirical-run/flash-tests/commit/45433fd
