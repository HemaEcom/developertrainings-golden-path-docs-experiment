---
title: "5. Local Development"
description: Run your MFE locally and the full capabilities summary
sidebar:
  order: 5
---

Almost there! Let's get your service running on your machine so you can develop comfortably. This is what your daily workflow will look like.

## Running Locally

The app and infrastructure are separate npm projects. For day-to-day development, you only work in `src/`:

```bash
# First time setup (from project root)
npm run co:login          # Authenticate with CodeArtifact for @hema/* packages
npm run install-all       # Installs root (CDK) + src (Next.js) dependencies

# Daily development
cd src
npm run dev               # Starts Next.js at http://localhost:3000
```

## Environment Variables

Create `src/.env.local` with your service's configuration:

```bash
# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
SANITY_API_READ_TOKEN=sk-...

# Service identity
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SERVICE_ID=your-service
ENVIRONMENT=test

# Domains (for next-intl multi-domain routing)
NEXT_PUBLIC_DOMAIN_NL=nl.localhost:3000
NEXT_PUBLIC_DOMAIN_COM=com.localhost:3000

# API access (if your MFE calls backend APIs)
BASE_API_URL=https://api.acc.hema.nl
AUTH_SECRET={"clientId":"...","clientSecret":"...","baseUrl":"https://..."}
```

Or fetch values from AWS (requires SSO login):
```bash
bash scripts/fetch-env-from-aws.sh
```

## Multi-Domain Local Setup

Since HEMA uses domain-based i18n routing (`hema.nl` vs `hema.com`), you need two local domains. Add to `/etc/hosts`:

```
127.0.0.1 nl.localhost
127.0.0.1 com.localhost
```

Then access:
- `http://nl.localhost:3000` → Dutch (nl-nl)
- `http://com.localhost:3000/nl-be` → Belgian Dutch

## Useful Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build (test before pushing) |
| `npm run test` | Run Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check |
| `npm run e2e:bdd` | Run Playwright BDD tests |

---

## Summary: What Every MFE Should Have

| Capability | Package/Tool | Required? |
|-----------|-------------|-----------|
| Next.js 15+ with App Router | `next` | ✅ |
| Standalone Docker output | `next.config.ts` → `output: 'standalone'` | ✅ |
| HEMA Design System | `@hema/hds-components-react`, `@hema/hds-tailwindcss-presets` | ✅ |
| Web Shell (layout) | `@hema/omni-web-app-shell-shell`, `@hema/omni-web-app-shell-core` | ✅ |
| Analytics | `@hema/omni-web-app-shell-analytics` | ✅ |
| Internationalization | `next-intl` | ✅ |
| CMS Integration | `@sanity/client`, `next-sanity` | If content-driven |
| Server Actions | Next.js built-in + `allowedOrigins` config | ✅ |
| Kong Authentication | `KongAuthenticator` class + `AUTH_SECRET` | If calling backend APIs |
| GraphQL (PODS) | `@apollo/client`, `@apollo/client-integration-nextjs` | If consuming product data |
| Route Groups | `(shop)` pattern for layout variants | Recommended |
| Gateway Registration | `@hema/omni-web-gateway-management-library-constructs` | ✅ |
| Health endpoint | `/api/health` | ✅ |
| Unit tests | `vitest`, `@testing-library/react` | ✅ |
| E2E tests | `@playwright/test`, `playwright-bdd` | ✅ |
| Security headers | `next.config.ts` headers | ✅ |
| Feature sandboxes | Butler + `buildspec-ci.yaml` | ✅ |
| CDK Infrastructure | `aws-cdk-lib`, ECS Fargate + ALB | ✅ |

---

## What's Next

Once your MFE is running, explore these guides for deeper topics:

| Topic | Guide |
|-------|-------|
| CDK Infrastructure Details | [Infrastructure](/developertrainings-golden-path-docs-experiment/golden-path/infrastructure/cdk-infrastructure) |
| Docker Build | [Docker Standalone](/developertrainings-golden-path-docs-experiment/golden-path/infrastructure/docker-standalone) |
| Gateway Registration | [Gateway Registration](/developertrainings-golden-path-docs-experiment/golden-path/gateway/gateway-registration) |
| Multi-Zone Config | [Multi-Zone](/developertrainings-golden-path-docs-experiment/golden-path/gateway/multi-zone-config) |
| Web Shell | [Web Shell](/developertrainings-golden-path-docs-experiment/golden-path/libraries/web-shell-integration) |
| HDS Components | [Design System](/developertrainings-golden-path-docs-experiment/golden-path/libraries/hds-integration) |
| i18n Setup | [Internationalization](/developertrainings-golden-path-docs-experiment/golden-path/onboarding/i18n-setup) |
| CMS Overview | [Sanity CMS](/developertrainings-golden-path-docs-experiment/golden-path/cms/overview) |
| Testing Strategy | [Testing](/developertrainings-golden-path-docs-experiment/golden-path/ci-cd/testing-strategy) |
| Butler Sandboxes | [Feature Sandboxes](/developertrainings-golden-path-docs-experiment/golden-path/ci-cd/butler-feature-sandboxes) |
| Monitoring | [Observability](/developertrainings-golden-path-docs-experiment/golden-path/monitoring/observability) |
| Data APIs (PODS) | [PODS Integration](/developertrainings-golden-path-docs-experiment/golden-path/data-apis/pods-integration) |
| Environments | [Environment Map](/developertrainings-golden-path-docs-experiment/golden-path/environments/environment-map) |
