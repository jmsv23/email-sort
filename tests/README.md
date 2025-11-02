# Testing Documentation

This project includes comprehensive testing coverage with unit tests, integration tests, and end-to-end (E2E) tests.

## Test Structure

```
tests/
├── setup.js                    # Jest setup with Testing Library
├── unit/                       # Unit tests for isolated components and functions
│   ├── components/             # React component tests
│   │   ├── MessagesList.test.tsx
│   │   ├── CategoriesSection.test.tsx
│   │   ├── BulkActionsBar.test.tsx
│   │   └── ...
│   ├── contexts/               # React Context tests
│   │   └── CategoryFilterContext.test.tsx
│   ├── lib/                    # Library function tests
│   │   ├── encryption.test.ts
│   │   └── gmail.test.ts
│   └── ai/                     # AI client tests
│       └── aiClient.test.ts
├── integration/                # Integration tests for API routes
│   └── api/
│       ├── categories.test.ts
│       └── messages.test.ts
├── e2e/                        # End-to-end tests with Playwright
│   ├── auth.spec.ts
│   ├── categories.spec.ts
│   ├── messages.spec.ts
│   └── bulk-actions.spec.ts
├── mocks/                      # Mock implementations
│   ├── gmail-api.ts
│   ├── ai-client.ts
│   └── prisma.ts
└── utils/                      # Test utilities and helpers
    ├── test-helpers.ts
    └── mock-session.ts
```

## Running Tests

### Unit & Integration Tests (Jest)

```bash
# Run all Jest tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### E2E Tests (Playwright)

```bash
# Run E2E tests in headless mode
npm run test:e2e

# Run E2E tests with UI interface
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed
```

### Run All Tests

```bash
# Run both Jest and Playwright tests
npm run test:all
```

## Test Coverage Goals

This project aims for **70% code coverage** across all test types:
- **Unit Tests**: Test individual components, functions, and modules in isolation
- **Integration Tests**: Test API routes with mocked database and external services
- **E2E Tests**: Test complete user flows from browser interaction to backend

## Writing Tests

### Unit Tests

Unit tests use Jest and React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Integration Tests

Integration tests mock external dependencies but test real API logic:

```typescript
import { GET } from '@/app/api/my-endpoint/route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth');
jest.mock('@/lib/prisma');

describe('API Route', () => {
  it('should return data for authenticated user', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-123' } });
    (prisma.myModel.findMany as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    expect(response.status).toBe(200);
  });
});
```

### E2E Tests

E2E tests use Playwright to simulate real user interactions:

```typescript
import { test, expect } from '@playwright/test';

test('should create a new category', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /create category/i }).click();
  await page.getByLabel(/name/i).fill('Test Category');
  await page.getByRole('button', { name: /^create$/i }).click();

  await expect(page.getByText('Test Category')).toBeVisible();
});
```

## Mocking Strategy

### Authentication
Authentication is mocked in tests to avoid requiring real OAuth credentials:
- Jest tests: Mock `next-auth` functions
- Playwright tests: Mock session cookies

### External Services
- **Gmail API**: Mocked using `tests/mocks/gmail-api.ts`
- **AI Client**: Mocked using `tests/mocks/ai-client.ts`
- **Database**: Mocked using `jest-mock-extended` for Prisma

### Example Mock Usage

```typescript
import { createMockGmailClient } from '@/tests/mocks/gmail-api';
import { createMockAIClient } from '@/tests/mocks/ai-client';

const mockGmail = createMockGmailClient();
const mockAI = createMockAIClient();
```

## Key Testing Principles

1. **Isolation**: Unit tests should test components in isolation
2. **Mocking**: Mock external dependencies (APIs, databases)
3. **Deterministic**: Tests should produce consistent results
4. **Fast**: Unit tests should run quickly (<100ms per test)
5. **Readable**: Test names should clearly describe what they test
6. **Coverage**: Aim for 70% coverage with focus on critical paths

## Test Fixtures

Test data factories are available in `tests/utils/test-helpers.ts`:

```typescript
import { createMockUser, createMockMessage } from '@/tests/utils/test-helpers';

const user = createMockUser({ email: 'custom@example.com' });
const messages = createMockMessages(10); // Create 10 mock messages
```

## Debugging Tests

### Debug Jest Tests
```bash
# Run a specific test file
npm test -- MessagesList.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="should render"

# Run with verbose output
npm test -- --verbose
```

### Debug Playwright Tests
```bash
# Run specific test file
npm run test:e2e -- messages.spec.ts

# Run with debug mode
npm run test:e2e -- --debug

# Generate HTML report
npm run test:e2e && npx playwright show-report
```

## CI/CD Integration

Tests are designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm ci

- name: Run unit tests
  run: npm run test:coverage

- name: Run E2E tests
  run: npm run test:e2e
```

## Coverage Report

After running tests with coverage:

```bash
npm run test:coverage
```

View the HTML coverage report:
```bash
open coverage/lcov-report/index.html
```

## Best Practices

### DO:
✅ Mock external API calls
✅ Use descriptive test names
✅ Test error cases and edge cases
✅ Clean up after tests (clear mocks, reset state)
✅ Use data factories for consistent test data

### DON'T:
❌ Make real API calls in tests
❌ Share state between tests
❌ Test implementation details
❌ Write flaky tests
❌ Skip tests without good reason

## Interview Talking Points

This testing setup demonstrates:

1. **Comprehensive Coverage**: Unit, integration, and E2E tests covering critical paths
2. **Professional Tooling**: Jest, React Testing Library, Playwright
3. **Mocking Strategy**: Proper mocking of external services to ensure fast, deterministic tests
4. **CI/CD Ready**: Tests can run in any environment without external dependencies
5. **Best Practices**: Follows testing pyramid (more unit tests, fewer E2E tests)
6. **Documentation**: Clear documentation for maintaining and extending tests

## Troubleshooting

### Tests failing due to missing environment variables
Solution: Ensure `.env.test` is properly configured with test values

### E2E tests timing out
Solution: Increase timeout in `playwright.config.ts` or optimize page load times

### Mock not being applied
Solution: Ensure mocks are defined before imports and cleared between tests

### Coverage not reaching 70%
Solution: Add tests for uncovered branches, especially error handling paths

---

For more information, see:
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
