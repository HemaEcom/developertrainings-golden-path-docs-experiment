# Testing Strategy

> Source: [omni-web-content-frontend](https://github.com/HemaEcom/omni-web-content-frontend) testing setup
> Stack: Vitest (unit) + Playwright BDD (e2e) | Coverage: V8

---

## Overview

The Golden Path testing strategy uses a two-layer approach:

| Layer | Tool | Purpose | Runs |
|-------|------|---------|------|
| **Unit / Integration** | Vitest + React Testing Library | Component logic, services, utilities | On every commit (CI) |
| **End-to-End (BDD)** | Playwright + playwright-bdd | User journeys, multi-locale, responsive | On deploy + on-demand |

Both layers are mandatory for production-ready MFEs.

---

## Unit & Integration Tests (Vitest)

### Setup

Install dependencies:

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event jsdom vite-tsconfig-paths
```

### Configuration

Create `vitest.config.mts`:

```ts
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    exclude: [
      'node_modules/**',
      '.next/**',
      'e2e/**',
      'types/',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      all: true,
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/**',
        '.next/**',
        'e2e/**',
        'types/',
      ],
    },
    deps: {
      inline: [
        'tailwind-merge',
        '@hema/hds-components-react',
        '@hema/omni-web-app-shell-shell',
      ],
    },
  },
  plugins: [tsconfigPaths()],
});
```

### Setup File

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom';

import React from 'react';
import { vi } from 'vitest';

// Mock server-only module for client component tests
vi.mock('server-only', () => ({}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock logger to avoid environment variable requirement
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock ResizeObserver globally
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

globalThis.React = React;
```

### Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest --run",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage --run"
  }
}
```

### Writing Unit Tests

Follow the pattern: test file lives next to the source file with `.test.ts(x)` suffix.

```
components/
  hero-block/
    hero-block.tsx
    hero-block.test.tsx
services/
  product-service.ts
  product-service.test.ts
utils/
  pagination-helpers.ts
  pagination-helpers.test.ts
```

**Example — Service test:**

```ts
import { describe, expect, it, vi } from 'vitest';

import { getProducts } from './product-service';

describe('ProductService', () => {
  it('should fetch products by category', async () => {
    const products = await getProducts({ category: 'home' });
    expect(products).toBeDefined();
    expect(products.length).toBeGreaterThan(0);
  });
});
```

**Example — Component test:**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeroBlock } from './hero-block';

describe('HeroBlock', () => {
  it('renders title and CTA', () => {
    render(<HeroBlock title="Welcome" ctaText="Shop now" ctaUrl="/shop" />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shop now' })).toHaveAttribute('href', '/shop');
  });
});
```

### Key Conventions

- Mock `server-only` for any server component tests
- Mock `next-intl` translations (return the key as the translation)
- Inline HDS and Web Shell packages in Vitest deps
- Use `@testing-library/jest-dom` matchers for DOM assertions
- Set test environment variables in `vitest.config.mts` `test.env`

---

## End-to-End Tests (Playwright BDD)

### Setup

Install dependencies:

```bash
npm install -D @playwright/test playwright-bdd dotenv
npx playwright install
```

### Configuration

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { defineBddConfig } from 'playwright-bdd';

const secretsFileName = process.env.SECRETS ?? '.env.local';
dotenv.config({ path: path.resolve(__dirname, secretsFileName) });

const isRemote = !!process.env.E2E_REMOTE;
const baseURL = process.env.E2E_BASE_URL ??
  (isRemote
    ? 'https://frontend.your-service.ui-int.hema.digital'
    : 'http://localhost:3001');

const bddTestDir = defineBddConfig({
  features: './e2e/features/**/*.feature',
  steps: ['./e2e/steps/**/*.ts', './e2e/pages/**/*.ts'],
  tags: process.env.E2E_TAGS ?? 'not @skip',
});

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !isRemote,
  forbidOnly: !!process.env.CI,
  retries: isRemote ? 0 : 3,
  workers: isRemote || process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'dot' : 'html',
  use: {
    baseURL,
    trace: isRemote ? 'on' : 'on-first-retry',
  },
  projects: [
    {
      name: 'bdd-chromium',
      testDir: bddTestDir,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'bdd-mobile',
      testDir: bddTestDir,
      use: { ...devices['Galaxy S5'] },
    },
  ],
  ...(!isRemote && {
    webServer: {
      command: 'npm run dev -- -p 3000',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
});
```

### BDD Structure

```
e2e/
├── features/              # Gherkin .feature files
│   ├── home-page/
│   │   ├── home-page-smoke.feature
│   │   ├── hero-block.feature
│   │   └── seo-metadata.feature
│   └── category-page/
│       └── category-page-smoke.feature
├── steps/                 # Step definitions
│   ├── common.steps.ts    # Shared navigation steps
│   ├── home-page/
│   │   ├── hero-block.steps.ts
│   │   └── seo-metadata.steps.ts
│   └── category-page/
│       └── category-smoke.steps.ts
├── pages/                 # Page Object Models
│   └── home.page.ts
├── helpers/               # Test utilities
│   └── fixtures.ts
└── constants/             # Test configuration
    ├── e2e-config.ts
    ├── slugs.ts
    └── view-ports.ts
```

### Writing Feature Files

Use Gherkin syntax with tags for filtering:

```gherkin
@smoke @critical @home-page
Feature: Home Page — Smoke Test Suite

  Background:
    Given a published home page exists in Sanity CMS
    When I navigate to the home page

  @smoke @critical
  Scenario Outline: Home page loads successfully for each locale
    When I navigate to "/<locale>"
    Then the page should return HTTP 200

    Examples:
      | locale |
      | nl-nl  |
      | fr-fr  |
      | nl-be  |
      | fr-be  |
      | de-de  |

  @smoke @critical
  Scenario: Hero Block renders with CTA
    Given a Hero Block is configured in the CMS
    Then the Hero Block should be visible with title and CTA
    And clicking the CTA should navigate to the configured URL
```

### Writing Step Definitions

```ts
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from '../pages/home.page';

const { Given, When, Then } = createBdd(test);

When('I navigate to {string}', async ({ homePage }, path: string) => {
  await homePage.goto(path);
});

Then('the Hero Block should be visible with title and CTA', async ({ page }) => {
  const hero = page.getByTestId('hero-block');
  await expect(hero).toBeVisible();
  await expect(hero.getByRole('link')).toBeVisible();
});
```

### Running E2E Tests

```bash
# Generate BDD test files from features
npx bddgen

# Run locally (starts dev server automatically)
npm run e2e:bdd

# Run against deployed environment
npm run e2e:bdd:remote

# Run specific device
npm run e2e:bdd:desktop
npm run e2e:bdd:mobile

# Run against staging
npm run e2e:bdd:staging
```

### Scripts

```json
{
  "scripts": {
    "e2e:bdd": "npx bddgen && SECRETS=.env.local playwright test --project=bdd-chromium --project=bdd-mobile",
    "e2e:bdd:desktop": "npx bddgen && SECRETS=.env.local playwright test --project=bdd-chromium",
    "e2e:bdd:mobile": "npx bddgen && SECRETS=.env.local playwright test --project=bdd-mobile",
    "e2e:bdd:remote": "npx bddgen && E2E_REMOTE=true npx playwright test --project=bdd-chromium --project=bdd-mobile",
    "e2e:bdd:staging": "npx bddgen && npx playwright install && SECRETS=.env.staging E2E_REMOTE=true npx playwright test --project=bdd-chromium --project=bdd-mobile"
  }
}
```

---

## Test Tagging Strategy

| Tag | Purpose | When to Run |
|-----|---------|-------------|
| `@smoke` | Core functionality works | Every deploy |
| `@critical` | Business-critical paths | Every deploy |
| `@regression` | Full regression suite | Nightly / pre-release |
| `@skip` | Temporarily disabled | Never (fix or remove) |
| `@requires-global-message` | Needs CMS config | Conditional |

Filter tests with the `E2E_TAGS` environment variable:
```bash
E2E_TAGS='not @skip and not @requires-global-message' npm run e2e:bdd
```

---

## Multi-Locale Testing

All MFEs serve multiple locales. E2E tests use `Scenario Outline` with locale examples:

```gherkin
Scenario Outline: Page loads for each locale
  When I navigate to "/<locale>"
  Then the page should return HTTP 200

  Examples:
    | locale |
    | nl-nl  |
    | fr-fr  |
    | nl-be  |
    | fr-be  |
    | de-de  |
```

---

## CI Integration

Tests run in the CI pipeline:

1. **Unit tests** — Run during the `build` phase in CodePipeline (via `npm test`)
2. **E2E tests** — Run after deployment to integration environment (via `npm run e2e:bdd:remote`)

The pipeline fails if either test layer fails, preventing broken code from reaching production.

---

## Infrastructure Tests

CDK infrastructure code also has unit tests (in the root `test/` directory):

```bash
# From project root (not src/)
npm test
```

These validate CDK stack synthesis and resource configuration.

---

## Reference Implementation

See `omni-web-content-frontend/src/` for the complete testing setup:
- `vitest.config.mts` — Vitest configuration
- `vitest.setup.ts` — Global test setup and mocks
- `playwright.config.ts` — Playwright BDD configuration
- `e2e/features/` — Gherkin feature files
- `e2e/steps/` — Step definitions
- `e2e/pages/` — Page Object Models
- `services/*.test.ts` — Service unit tests
- `components/*/*.test.tsx` — Component tests
- `utils/*.test.ts` — Utility tests
