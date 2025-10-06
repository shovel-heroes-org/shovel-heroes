# Test-Driven Development (TDD) Guideline

## Purpose
This steering document defines TDD practices and workflow to ensure test-first development throughout the project lifecycle.

## TDD Fundamentals

### Red-Green-Refactor Cycle
1. **Red**: Write a failing test that defines desired behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

### Core Principles
- Write tests before implementation code
- Test one thing at a time
- Keep tests simple, readable, and maintainable
- Run tests frequently during development
- Never commit failing tests

## Test-First Development Approach

### Before Writing Code
1. Understand the requirement/user story
2. Define expected behavior and edge cases
3. Write test cases that verify the behavior
4. Run tests to confirm they fail (Red phase)

### Implementation Flow
```
Requirement → Test Case → Failing Test → Implementation → Passing Test → Refactor → Commit
```

### Test Pyramid Strategy
- **Unit Tests (70%)**: Test individual functions/methods in isolation
- **Integration Tests (20%)**: Test component interactions and workflows
- **E2E Tests (10%)**: Test complete user scenarios

## Test Organization

### Directory Structure
```
src/
  ├── module/
  │   ├── service.ts
  │   └── service.test.ts        # Unit tests co-located
  └── __tests__/
      ├── integration/           # Integration tests
      └── e2e/                   # End-to-end tests
```

### Naming Conventions
- Test files: `*.test.ts` or `*.spec.ts`
- Test suites: `describe('ComponentName', () => {...})`
- Test cases: `it('should behave in expected way', () => {...})` or `test('description', () => {...})`
- Use clear, descriptive names that explain what is being tested

## Coverage Requirements

### Minimum Thresholds
- **Overall Coverage**: ≥ 80%
- **Statements**: ≥ 80%
- **Branches**: ≥ 75%
- **Functions**: ≥ 80%
- **Lines**: ≥ 80%

### Critical Code Requirements
- All public APIs: 100% coverage
- Business logic: ≥ 90% coverage
- Error handling: All error paths tested
- Edge cases: All identified edge cases tested

## Best Practices

### Writing Good Tests
- **Arrange-Act-Assert (AAA)**: Structure tests clearly
- **Single Assertion**: Focus each test on one behavior
- **Independence**: Tests should not depend on each other
- **Repeatability**: Tests should produce same results every time
- **Fast Execution**: Keep tests fast (< 100ms for unit tests)

### Test Data Management
- Use factories or builders for test data creation
- Avoid hardcoded values; use constants or fixtures
- Clean up test data after execution
- Mock external dependencies (APIs, databases, file system)

### Mocking and Stubbing
- Mock external dependencies to isolate unit under test
- Use dependency injection to enable testability
- Stub time-dependent functions for deterministic tests
- Verify mock interactions when testing behavior

### Assertion Guidelines
- Use specific, meaningful assertions
- Prefer semantic matchers (`toEqual`, `toContain`, `toThrow`)
- Include error messages for custom assertions
- Test both positive and negative cases

## Anti-Patterns to Avoid

### Test Smells
- ❌ **Testing Implementation Details**: Test behavior, not internals
- ❌ **Fragile Tests**: Tests that break with minor refactoring
- ❌ **Slow Tests**: Tests that take too long to execute
- ❌ **Flaky Tests**: Tests with inconsistent results
- ❌ **Overmocking**: Excessive mocking that tests mocks instead of code

### Bad Practices
- ❌ Writing tests after code is complete
- ❌ Skipping tests for "simple" functions
- ❌ Ignoring failing tests
- ❌ Writing tests that depend on execution order
- ❌ Testing framework code instead of application code

## Integration with SDD Workflow

### Requirements Phase
- Define testability requirements
- Identify test scenarios in acceptance criteria
- Document edge cases that need testing
- Specify performance/quality test requirements

### Design Phase
- Design for testability (SOLID principles)
- Plan test strategy (unit/integration/e2e mix)
- Identify mockable dependencies
- Document test data requirements

### Tasks Phase
- Break down implementation tasks with test-first approach
- Each task includes: Write test → Implement → Refactor
- Estimate includes time for writing tests
- Define "done" criteria including test coverage

### Implementation Phase
- Follow TDD cycle strictly: Red → Green → Refactor
- Write failing test before any production code
- Run tests continuously (watch mode recommended)
- Commit only when all tests pass

### Code Review Phase
- Verify test coverage meets thresholds
- Review test quality and clarity
- Check for test smells and anti-patterns
- Ensure tests validate requirements

## Testing Tools and Configuration

### Recommended Tools
- **Test Framework**: Jest (for JavaScript/TypeScript projects)
- **Assertion Library**: Jest built-in matchers
- **Mocking**: Jest mock functions
- **Coverage**: Jest coverage reporting
- **Watch Mode**: `npm test -- --watch`

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test path/to/test.test.ts
```

## Quality Gates

### Pre-Commit
- All tests must pass
- Coverage thresholds must be met
- No skipped or pending tests

### Pre-Merge
- Full test suite passes
- Integration tests pass
- Coverage report reviewed
- No decrease in coverage percentage

### Continuous Integration
- Automated test execution on every push
- Coverage reporting in CI pipeline
- Block merge if tests fail
- Publish test results for visibility

## TDD Benefits

### Code Quality
- Higher code quality through upfront design
- Better error handling (tested edge cases)
- More maintainable code
- Self-documenting through tests

### Development Speed
- Faster debugging (tests pinpoint issues)
- Confident refactoring with safety net
- Reduced regression bugs
- Earlier defect detection

### Design Improvement
- Forces modular, testable design
- Encourages loose coupling
- Promotes single responsibility
- Results in cleaner interfaces

## Getting Started with TDD

### For New Features
1. Read and understand the requirement
2. Write test cases covering expected behavior
3. Run tests to see them fail
4. Implement minimal code to pass tests
5. Refactor and improve while keeping tests green
6. Commit when all tests pass

### For Bug Fixes
1. Write a test that reproduces the bug (failing test)
2. Fix the bug to make test pass
3. Add additional tests for related edge cases
4. Refactor if needed
5. Commit fix with passing tests

### For Legacy Code
1. Identify the module/function to modify
2. Write characterization tests (document current behavior)
3. Refactor for testability if needed
4. Add new tests for new behavior
5. Implement changes following TDD cycle
6. Ensure all tests pass

## Continuous Improvement
- Review test failures to improve test quality
- Refactor tests as code evolves
- Update coverage thresholds as project matures
- Share TDD learnings with team
- Celebrate improved code quality metrics

## Enforcement
This document is **always** active and applies to all development phases. Every code change should follow TDD principles as defined here.
