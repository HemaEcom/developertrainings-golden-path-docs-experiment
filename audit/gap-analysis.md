# Golden Path Gap Analysis

> Generated: 2026-05-28
> Method: Compared Golden Path documentation (master v18, tutorial v27) against actual repo implementations
> Repos analyzed: omni-web-content-frontend, omni-web-catalog-pdp, omni-web-app-shell-library, hema-design-system, omni-web-gateway, omni-web-gateway-api, metis-general

---

## Executive Summary

The Golden Path documentation provides a solid **conceptual foundation** (principles, lifecycle, contribution model) but has significant gaps in **practical implementation guidance**. The tutorial gets developers started but stops short at the most critical integration points. Teams following the tutorial today would hit dead ends at Part 4 (CDK infrastructure) and Part 5 (platform capabilities).

**Key finding:** The repos contain mature, well-structured implementations that are NOT reflected in the documentation. The gap between "what exists" and "what's documented" is substantial.

---

## 1. What the Golden Path Currently Covers

### Master Document (v18)
- ✅ Purpose and philosophy (well articulated)
- ✅ Principles (composable architecture, reusable solutions, DORA alignment)
- ✅ Service-oriented frontend concept
- ✅ ADR/RFC contribution model
- ✅ High-level lifecycle (create → build → deploy → operate)
- ✅ Reference to omni-web-content-frontend as example repo

### Tutorial (v27)
- ✅ Part 1: Foundation setup (TypeScript skeleton template, repo structure)
- ✅ Part 2: CI/CD pipeline deployment (cdk deploy, verify stacks)
- ✅ Part 3: Next.js application scaffolding (create-next-app)
- ⚠️ Part 4: Infrastructure integration (placeholder — "use omni-web-content as inspiration")
- ⚠️ Part 5: Platform capabilities (placeholder — links to HDS docs, no actual guide)
- ❌ Web Shell integration (mentioned in "What's Next" but not written)
- ❌ Feature sandbox deployment (mentioned but not documented)
- ❌ Release to pre-prod/production (mentioned but not documented)

---

## 2. What the Repos Reveal That ISN'T Documented

### 2.1 Infrastructure (CDK) — Critical Gap

The actual CDK structure in both `omni-web-content-frontend` and `omni-web-catalog-pdp` is significantly more complex than the tutorial suggests:

| Component | Documented? | Actual Implementation |
|-----------|-------------|----------------------|
| `lib/common/ecs/` — ECS Fargate service | ❌ | Full ECS task definition, service, auto-scaling |
| `lib/common/alb/` — Application Load Balancer | ❌ | ALB with health checks, target groups |
| `lib/common/cloudfront/` — CloudFront distribution | ❌ | VPC origin, cache policies |
| `lib/common/alarms/` — CloudWatch alarms | ❌ | Alarm definitions, thresholds |
| `lib/common/lambda/` — Lambda functions | ❌ | Supporting Lambda functions |
| `lib/common/parameters/` — SSM parameters | ❌ | Full parameter store integration |
| `lib/components/ecs-nextjs.bundle.ts` — ECS+Next.js bundle | ❌ | Complete ECS+Docker+Next.js construct |
| `lib/runtime/runtime-stack.ts` — Full runtime stack | ❌ | VPC lookup, ECS, ALB, Gateway registration, monitoring |
| `lib/pipeline/pipeline-stack.ts` — Full pipeline | ❌ | CodePipeline V2, synth, deploy, integration tests, garbage collection |
| Docker containerization (`src/Dockerfile`) | ❌ | Standalone Next.js output in Docker |
| `output: 'standalone'` in next.config.ts | ❌ | Required for Docker deployment |

**Impact:** A team following the tutorial would have NO idea how to actually deploy their Next.js app. The gap between "scaffold Next.js" and "running in production" is enormous.

### 2.2 Gateway Registration — Critical Gap

The gateway registration system is completely undocumented in the Golden Path:

| Component | What It Does |
|-----------|-------------|
| `@hema/omni-web-gateway-management-library-constructs` | CDK construct for registering MFE routes with the gateway |
| `@hema/omni-web-gateway-management-library-types` | TypeScript types (OriginType, Route, ZoneRegistration) |
| `@hema/omni-web-gateway-management-library-utils` | Utility functions (buildGatewayZones) |
| `gateway-routes-config.json` | Route definitions (prefix, exact, regex) with localization |
| `gateway-environments.ts` | Domain/locale mapping and rollout percentage configuration |
| `GatewayRegistration` construct | Registers zones, creates preview URLs, manages VPC origins |
| RAM resource shares | Cross-account VPC origin access for CloudFront |

**The gateway is the backbone of the multi-zone architecture.** Without documenting how to register routes, configure domains, and manage rollout percentages, teams cannot ship a new MFE.

### 2.3 Web Shell Library — High Gap

The `omni-web-app-shell-library` is a monorepo with 5 packages consumed by every MFE:

| Package | Purpose | Documented in Golden Path? |
|---------|---------|---------------------------|
| `@hema/omni-web-app-shell-shell` | Layout, header, footer, global providers | ❌ |
| `@hema/omni-web-app-shell-core` | Core utilities, configuration, context | ❌ |
| `@hema/omni-web-app-shell-analytics` | Analytics integration (GTM, consent) | ❌ |
| `@hema/omni-web-app-shell-platform-api` | Platform API client | ❌ |
| `@hema/omni-web-app-shell-api-client` | HTTP client utilities | ❌ |

The content-frontend uses shell v3.0.0. The tutorial mentions "Install web-shell library" in "What's Next" but provides zero guidance.

### 2.4 HDS (Tompouce) Integration — Medium Gap

The tutorial links to HDS Storybook docs but doesn't explain:

| Missing | Details |
|---------|---------|
| Package installation | `@hema/hds-components-react`, `@hema/hds-tailwindcss-presets`, `@hema/hds-assets` |
| Tailwind CSS 4 setup | PostCSS config, `@tailwindcss/postcss`, HDS presets |
| Version alignment | Using RC versions (`2.1.0-rc.xxx`), overrides needed |
| SSR compatibility | Styled-components + server components considerations |

### 2.5 Multi-Zone Configuration — Medium Gap

The `next.config.ts` reveals critical multi-zone patterns not documented:

- `assetPrefix` — zone-specific asset paths (`_zones/omni-web-content`)
- `rewrites` — zone-aware URL rewriting
- `imagesPath` — zone-specific image optimization paths
- `deriveZoneConfig()` utility — derives config from service ID
- Security headers (HSTS, X-Content-Type-Options, Referrer-Policy, No-Vary-Search)

### 2.6 Internationalization (i18n) — Medium Gap

Both MFEs use `next-intl` with complex locale routing:

- Multi-domain setup (hema.nl for NL, hema.com for BE/FR/DE)
- Locale-prefixed routes on .com domain
- Translation sync scripts (`sync:translations`)
- Middleware-based locale detection

### 2.7 Content Management (Sanity) — Medium Gap

The content-frontend has deep Sanity integration:

- `@sanity/client`, `next-sanity`, `@sanity/image-url`
- Draft mode (preview) with API routes
- GraphQL queries for content
- Environment-specific datasets
- Sanity Studio URL configuration

### 2.8 Testing Patterns — Medium Gap

The repos reveal a mature testing stack not documented:

| Layer | Tool | Documented? |
|-------|------|-------------|
| Unit tests | Vitest + React Testing Library | ❌ |
| E2E tests | Playwright BDD (`playwright-bdd`) | ❌ |
| Infrastructure tests | Vitest (root `test/`) | ❌ |
| Multi-locale E2E | Per-locale Playwright projects | ❌ |
| Remote E2E | Against deployed environments | ❌ |

### 2.9 Butler (Feature Sandbox) — Low-Medium Gap

The tutorial mentions Butler but doesn't explain:

- `buildspec-ci.yaml` — the actual Butler build specification
- Branch naming → stack naming convention
- Environment variable injection during Butler builds
- Sandbox URL pattern: `https://frontend-{branch}.{service}.ui-test.hema.digital/`
- Cleanup behavior (auto-delete on branch merge)
- `butlerStackTag` for stack lifecycle management

### 2.10 Monitoring & Observability — Low-Medium Gap

The runtime stack shows monitoring patterns:

- `@hema/monitoring-constructs` — AlertPublisher, HemaAuthorization
- CloudWatch alarms on ECS services
- `@hema/monitoring-logger` (Winston-based) for structured logging
- `instrumentation.ts` for Next.js telemetry

### 2.11 Environment Configuration — Low-Medium Gap

Complex environment management not documented:

- SSM Parameter Store for all config (`/hema/{service}/{env}/...`)
- Secrets Manager for sensitive values (Sanity tokens, Kong API tokens)
- `.env.example` files for local development
- `environment-variables.sh` scripts for local env setup
- `service-info.json` for service metadata

### 2.12 Gateway Infrastructure — Low Gap (separate concern)

The `omni-web-gateway` and `omni-web-gateway-api` repos reveal the full gateway system:

- CloudFront distributions per domain (NL, COM)
- CloudFront Functions for routing (`src/functions/routing.ts`)
- KeyValueStore for route configuration
- WAF integration
- Kinesis/Athena for real-time logging
- Gateway Management API (DynamoDB, Lambda, API Gateway)
- Zone/origin/route CRUD operations

This is platform-team owned but MFE teams need to understand how their registration interacts with it.

---

## 3. Gaps by Priority

### 🔴 HIGH Priority (Blocks new team onboarding) — ✅ ALL COMPLETED (2026-05-29)

| # | Gap | Status |
|---|-----|--------|
| H1 | CDK Infrastructure Guide | ✅ `sections/infrastructure/cdk-infrastructure.md` |
| H2 | Gateway Registration Guide | ✅ `sections/gateway/gateway-registration.md` |
| H3 | Web Shell Integration Guide | ✅ `sections/libraries/web-shell-integration.md` |
| H4 | Multi-Zone next.config.ts Setup | ✅ `sections/gateway/multi-zone-config.md` |
| H5 | Docker/Standalone Build Configuration | ✅ `sections/infrastructure/docker-standalone.md` |

### 🟡 MEDIUM Priority (Slows teams down, causes inconsistency) — ✅ ALL COMPLETED (2026-05-29)

| # | Gap | Status |
|---|-----|--------|
| M1 | HDS Integration (step-by-step) | ✅ `sections/libraries/hds-integration.md` |
| M2 | i18n Setup (next-intl + multi-domain) | ✅ `sections/onboarding/i18n-setup.md` |
| M3 | Testing Strategy (Vitest + Playwright BDD) | ✅ `sections/ci-cd/testing-strategy.md` |
| M4 | Environment Configuration (SSM + Secrets Manager) | ✅ `sections/onboarding/environment-configuration.md` |
| M5 | Butler buildspec-ci.yaml Guide | ✅ `sections/ci-cd/butler-feature-sandboxes.md` |
| M6 | Monitoring Setup (alarms, logging) | ✅ `sections/monitoring/observability.md` |
| M7 | Sanity CMS Integration Pattern | ✅ `sections/cms/` (5 documents) |

### 🟢 LOW Priority (Nice to have, can be deferred) — PARTIALLY COMPLETED

| # | Gap | Status |
|---|-----|--------|
| L1 | Gateway Architecture Overview | Helps teams understand the system but not required for onboarding |
| L2 | CodeArtifact Login Setup | Covered in Butler guide |
| L3 | Commit Conventions (commitlint) | ❌ Not yet documented |
| L4 | CODEOWNERS Setup | ❌ Not yet documented |
| L5 | MkDocs/TechDocs Integration | ❌ Not yet documented |
| L6 | Security Headers Configuration | ✅ `sections/security/security-headers-waf.md` |
| L7 | Performance & Caching | ✅ `sections/performance/caching-cdn.md` |

---

## 4. Structural Observations

### Tutorial Structure Issues

1. **The `app/` vs `src/` discrepancy**: Tutorial says to create Next.js in `app/` directory, but both real repos use `src/` directory. This is a direct contradiction.

2. **Node.js version**: Tutorial says "Version 18 or 20", but repos require `>=22.0.0` (content-frontend) and `>=24.0.0` (catalog-pdp). The tutorial is outdated.

3. **Package manager**: Tutorial uses `npm` throughout, which matches the repos. Good alignment here.

4. **Tailwind CSS version**: Tutorial suggests `--tailwind` flag in create-next-app, but repos use Tailwind CSS v4 with `@tailwindcss/postcss` (not the default Tailwind setup from create-next-app).

### Documentation Fragmentation

Platform documentation is split across:
- Golden Path (Confluence → this repo)
- metis-general (Service Catalog TechDocs)
- Individual repo READMEs and docs/ folders
- Backstage Service Catalog
- devops-butler repo docs

The Golden Path should be the **entry point** that links to these sources, not try to duplicate them.

---

## 5. Recommended Next Steps

### Immediate (Week 1-2)

1. **Fix the `app/` → `src/` discrepancy** in the tutorial
2. **Update Node.js version** requirement to >=22
3. **Write Part 4: CDK Infrastructure** — document the ECS+ALB+Docker pattern with code examples from omni-web-content-frontend
4. **Write Gateway Registration section** — explain `gateway-routes-config.json`, the `GatewayRegistration` construct, and how to define routes

### Short-term (Week 3-4)

5. **Write Web Shell integration guide** — which packages to install, how to wrap your app, what providers are needed
6. **Write multi-zone next.config.ts guide** — explain `deriveZoneConfig`, `assetPrefix`, `rewrites`
7. **Document the Docker/standalone build** — Dockerfile pattern, `output: 'standalone'`
8. **Write Butler buildspec-ci.yaml guide** — how feature sandboxes work

### Medium-term (Month 2)

9. **HDS step-by-step integration** — packages, Tailwind v4 setup, presets
10. **Testing strategy document** — Vitest for unit, Playwright BDD for E2E
11. **Environment configuration guide** — SSM parameters, Secrets Manager, local .env
12. **Monitoring setup guide** — alarms, logging, AlertPublisher

### Ongoing

13. **Keep tutorial validated** against actual repo structure (automate this?)
14. **Link to metis-general** for platform-level docs (Butler, CodeArtifact, AWS access)
15. **Create a "reference architecture" diagram** showing all components and their relationships

---

## 6. Source of Truth Mapping

| Topic | Primary Source | Golden Path Role |
|-------|---------------|-----------------|
| CDK patterns | omni-web-content-frontend `lib/` | Document the pattern, link to repo |
| Gateway registration | omni-web-gateway-management-library | Document how to use, link to library docs |
| Web Shell | omni-web-app-shell-library | Document integration, link to library README |
| HDS | hema-design-system Storybook | Document setup steps, link to Storybook |
| Butler | devops-butler repo + metis-general | Document buildspec, link to Butler docs |
| Platform onboarding | metis-general | Link to getting-started docs |
| Architecture principles | metis-general | Reference, don't duplicate |
| CI/CD pipeline | omni-web-content-frontend `lib/pipeline/` | Document the pattern |
| Monitoring | @hema/monitoring-constructs | Document usage pattern |

---

## 7. Metrics

| Metric | Value |
|--------|-------|
| Total sections in tutorial | 5 parts |
| Sections with actual content | 3 (Parts 1-3) |
| Sections that are placeholders | 2 (Parts 4-5) |
| "What's Next" items not written | 3 |
| TODO comments in tutorial | 3 |
| Critical undocumented patterns | 5 (H1-H5) |
| Medium-priority gaps | 7 (M1-M7) |
| Low-priority gaps | 6 (L1-L6) |
| Repos with mature implementations | 7 |
| Shared libraries consumed by MFEs | 8+ |
