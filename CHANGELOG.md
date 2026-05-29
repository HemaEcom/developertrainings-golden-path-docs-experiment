# Golden Path - Changelog

Track iterations, changes, and decisions made to the Golden Path documentation.

## Format

Each entry follows:
```
## [YYYY-MM-DD] - Brief title
### What changed
### Why
### Gaps identified
### Next steps
```

---

## [2026-05-29] - Data APIs overview (PODS strategic direction)

### What changed
- **New file:** `sections/data-apis/overview.md` — High-level explanation of PODS as the strategic direction for product data. Covers why PODS (unified, real-time, GraphQL), what data it provides, which MFEs use it, and the direction of travel away from SFCC Commerce API.

### Why
PODS is a key architectural decision (ADR-0008) that every team needs to understand. New MFEs must use PODS for product data, not SFCC. The existing technical guide (`pods-integration.md`) covers the how; this overview covers the why and the strategic context.

---

## [2026-05-29] - ADR-0005 correction + Federated Sitemaps

### What changed
- **Updated:** `sections/adrs/adr-summary.md` — Corrected ADR-0005 from "contradicted" to "both approaches valid". OpenNext is a valid choice for serverless MFEs (account, support). ECS remains the default for high-traffic MFEs.
- **New file:** `sections/gateway/federated-sitemaps.md` — How the gateway assembles sitemaps from multiple zones, MFE requirements for sitemap generation, zone replacement keys, SFCC migration sequence.
- **Reverted:** `sections/infrastructure/cdk-infrastructure.md` — Removed OpenNext mention (not part of the Golden Path default, just a valid alternative per ADR).

### Sources used
- `HEM100-ADR-0005-use-opennext-for-account-pages.md`
- `HEM100-ADR-federated-sitemap-architecture.md`
- `omni-web-content-frontend/src/app/sitemap-index/route.ts`, `src/app/sitemaps/`

---

## [2026-05-29] - ADR review + Data APIs section (Kong auth, PODS)

### What changed
- **New file:** `sections/adrs/adr-summary.md` — Full index of all 20 numbered ADRs + unnumbered ones, mapped against Golden Path coverage. Identifies 6 gaps, confirms 14 decisions are well-covered.
- **New file:** `sections/data-apis/kong-authentication.md` — Kong OAuth2 client credentials pattern: KongAuthenticator class, proactive token refresh, CDK secret injection, usage with Apollo and REST clients
- **New file:** `sections/data-apis/pods-integration.md` — PODS GraphQL integration: Apollo Client setup for RSC, store IDs per country, query patterns, repository+service architecture, locale mapping, error handling

### Why
ADR review revealed that the Golden Path was missing two critical patterns that any MFE calling backend services needs:
1. How to authenticate with Kong API Gateway (ADR-0015)
2. How to fetch product data from PODS (ADR-0008)

Also identified that ADR-0005 (OpenNext/Lambda) has been superseded by the ECS approach — the Golden Path correctly documents ECS but this evolution should be formally noted.

### Sources used
- **ADRs read:** All 20 numbered ADRs (HEM100-ADR-0001 through 0020) + 10 unnumbered ADRs
- **Repos read:**
  - `omni-web-catalog-pdp/` — src/services/auth/kong-authenticator.ts, src/services/pods/pods-service.ts, src/services/pods/queries/get-products.ts, src/repositories/pods/pods-repository.impl.ts, src/clients/graphql/apollo-client-rsc.ts

### Key findings
- **14 of 20 ADRs** are fully reflected in existing Golden Path docs
- **ADR-0005 (OpenNext)** is contradicted by current implementation (ECS) — needs a superseding ADR
- **ADR-0012 (Server Actions vs API Routes)** — practical guidance missing
- **Federated Sitemap** — implementation exists but not documented
- **Accessibility testing** — ADR exists but no MFE-facing guidance

### Gaps remaining
- Server actions vs API routes guidance (medium priority)
- Federated sitemap setup guide (medium priority)
- Accessibility testing patterns (low priority)
- Formal ADR superseding ADR-0005 with ECS decision (governance)

---

## [2026-05-29] - Environments map across all services

### What changed
- **New file:** `sections/environments/environment-map.md` — Comprehensive environment landscape covering:
  - AWS accounts (production: 214061306515, non-production: 213617179136)
  - Environment naming model (`@hema/common-types` Environment interface)
  - Per-service environment tables (Content MFE, Catalog PDP, CMS, Gateway, Gateway API, Libraries)
  - Developer journey flow diagrams (sandbox → test → production)
  - CMS-specific flow (sandbox dataset creation, staging tag-trigger, migrations)
  - SSM Parameter Store namespace convention (full tree)
  - Secrets Manager convention (all secret paths)
  - CDK stack naming convention
  - CDK tags applied to all stacks
  - Key differences between environments (what's enabled/disabled per stage)

### Why
Understanding which environments exist, how they relate, and where configuration lives is critical for onboarding. Previously this information was scattered across runtime-parameters.ts, pipeline-stack.ts, and bin/solution.ts files in each repo. Now it's consolidated in one reference document.

### Sources used
- **Repos read:**
  - `omni-web-content-frontend/` — bin/solution.ts, lib/runtime/runtime-parameters.ts, lib/pipeline/pipeline-stack.ts, cdk.json
  - `omni-web-catalog-pdp/` — bin/solution.ts, lib/runtime/runtime-parameters.ts, lib/pipeline/pipeline-stack.ts, cdk.json
  - `omni-cms-composable-cms/` — infrastructure/bin/cms.ts, infrastructure/lib/pipeline/pipeline-parameters.ts, cdk.context.json
  - `omni-web-gateway/` — bin/solution.ts, lib/pipeline/pipeline-stage.ts, lib/common/environment.ts
  - `omni-web-gateway-api/` — bin/solution.ts

### Gaps remaining
- Exact domain URLs for test/preview environments (need gateway output values)
- Network topology (VPC peering, cross-account access patterns)
- Cost allocation per environment

---

## [2026-05-29] - Quick Reference Card + Cross-validation against PDP

### What changed
- **New file:** `sections/onboarding/quick-reference-card.md` — Single-page cheat sheet covering setup, local dev, CDK, Butler, gateway routes, Sanity CMS, env vars, project structure, key libraries, locales, common issues, and useful links
- **New file:** `audit/cross-validation.md` — Detailed comparison of `omni-web-content-frontend` vs `omni-web-catalog-pdp` confirming all guides are generalizable

### Why
The remaining work list called for a Quick Reference Card and cross-validation. The cross-validation confirms the Golden Path patterns work for both content-focused MFEs (Sanity-driven pages) and product-focused MFEs (PODS GraphQL + Sanity config). Key differences documented: Node.js version (22 vs 24), data layer (GROQ-only vs Apollo+GROQ), route matching (prefix vs regex), and state management (server-only vs Zustand).

### Sources used
- **Repos read:**
  - `omni-web-catalog-pdp/` — package.json, src/package.json, src/next.config.ts, lib/runtime/runtime-stack.ts, lib/runtime/gateway-environments.ts, lib/runtime/gateway-routes-config.json, src/repositories/sanity/sanity-repository.impl.ts, src/clients/sanity/client.ts, src/clients/graphql/apollo-client-rsc.ts, src/services/pods/pods-service.ts, src/services/auth/kong-authenticator.ts, src/middleware.ts, buildspec-ci.yaml, .env.example

### Key findings from cross-validation
- Both repos use identical CDK patterns (EcsNextJsBundle, GatewayRegistration, AlertPublisher)
- Both use Web Shell v3, HDS RC, Tailwind v4, next-intl, next-sanity
- PDP adds Apollo Client for PODS GraphQL (product data) — domain-specific, not a guide gap
- PDP uses regex route matching and rollout groups — more advanced gateway config
- PDP has configurable cache TTLs via env vars (newer pattern, recommended)
- Security headers: content-frontend has them in next.config.ts, PDP relies on gateway

### Gaps remaining
- PODS/GraphQL integration guide (PDP-specific pattern, low priority)
- Accessibility (WCAG) patterns — not yet established in repos
- Troubleshooting guide — needs team input

---

## [2026-05-29] - CMS integration + Monitoring + Security + Performance (L1-L4)

### What changed
- **New CMS section** (`sections/cms/`):
  - `overview.md` — CMS architecture, supported countries/locales, key concepts, deployment environments
  - `content-modeling.md` — Full schema architecture: page types, reusable components, configuration documents, translated fields pattern, object types, how to add new types
  - `mfe-integration.md` — How MFEs consume CMS data: client setup, repository pattern, GROQ query patterns, page rendering flow, caching strategy, environment-specific behavior
  - `content-flow.md` — End-to-end content delivery: published vs draft flow, Presentation Tool config, URL resolution, draft mode API routes, Sanity Releases support, visual editing (stega), request tagging
  - `dam-sync.md` — Bynder DAM synchronization: Kafka pipe → SQS → Lambda architecture, what gets synced, Bynder plugin, license territory tracking, troubleshooting
  - `deployment.md` — CMS CI/CD pipeline: stages (prod/preprod/staging/sandbox), pipeline architecture, synth/deploy steps, sandbox naming, local deployment, branch deletion webhook

- **New Monitoring section** (`sections/monitoring/`):
  - `observability.md` — AlertPublisher setup, alarm types (ECS CPU/Memory, ALB 5xx/unhealthy hosts), alarm sensitivity levels, application logging with `@hema/monitoring-logger`, PII scrubbing, health checks, Sanity request tagging

- **New Security section** (`sections/security/`):
  - `security-headers-waf.md` — WAF rules (geo-block, ASN block, AWS managed rules, bot control), data protection in WAF logs, security headers (HSTS, nosniff, referrer-policy, No-Vary-Search), secrets management patterns, security checklist

- **New Performance section** (`sections/performance/`):
  - `caching-cdn.md` — Cache layers (CloudFront, ISR, unstable_cache, Sanity CDN), ISR configuration, image optimization, No-Vary-Search for CDN efficiency, standalone output, performance checklist

### Why
These were the remaining low-priority gaps (L1-L4) from the gap analysis. With these sections complete, the Golden Path now covers the full stack: from creating a service, through infrastructure, CI/CD, libraries, CMS integration, monitoring, security, and performance. A new developer can follow the entire path end-to-end.

### Sources used
- **Repos read:**
  - `omni-cms-composable-cms/` — package.json, sanity.config.ts, schemaTypes/sanityConstants.ts, schemaTypes/index.ts, schemaTypes/documents/ (homePage, flexibleContentPage, microcopy, shellConfiguration), schemaTypes/lib/presentation/resolve.ts, infrastructure/lib/ (runtime-stack, pipeline-stack, components/dam-sync-kafka, lambdas/dam-sync), scripts/deploy.sh, structure/ecommerceStructure.ts
  - `omni-web-content-frontend/` — src/repositories/sanity/ (client.ts, env.ts, page-data-repository.ts, preview/live.ts, queries/page.ts, queries/microcopy.ts, microcopy-repository.ts), src/app/api/draft-mode/enable/route.ts, src/app/[locale]/page.tsx, src/app/[locale]/[...slugs]/page.tsx, src/next.config.ts, src/utils/logger.ts, lib/runtime/runtime-stack.ts, lib/common/alarms/, lib/common/ecs/service.ts, lib/common/alb/load-balancer.ts, lib/components/ecs-nextjs.bundle.ts
  - `omni-web-gateway/` — lib/runtime/waf-stack.ts
- **No Confluence pages fetched** (repo content was comprehensive)
- **No skills activated** (direct repo reading provided all implementation details)

### Gaps remaining
- L5: CodeArtifact login setup (minor — covered in butler guide)
- L6: Commit conventions / commitlint (minor)
- L7: CODEOWNERS setup (minor)
- Accessibility (WCAG compliance) — no specific patterns found in repos yet
- Troubleshooting common issues — needs team input

### Next steps
- Consider a "Quick Reference Card" — single-page cheat sheet for common commands
- Validate all guides against `omni-web-catalog-pdp` to ensure patterns are generalizable
- Add accessibility section when WCAG patterns are established
- Gather troubleshooting scenarios from team

---

## [2026-05-29] - Write medium-priority sections (M1-M5) + link tutorial Parts 4-5

### What changed
- **New sections written:**
  - `sections/libraries/hds-integration.md` (M1) — Full HDS/Tompouce integration guide: packages, Tailwind CSS v4 setup, prefix(hds), PostCSS config, component usage, fonts, icons, Vitest config
  - `sections/onboarding/i18n-setup.md` (M2) — Multi-domain i18n with next-intl: routing config, domain setup, middleware, translation loading from CMS with fallback, locale-messages sync
  - `sections/ci-cd/testing-strategy.md` (M3) — Two-layer testing: Vitest (unit/integration) + Playwright BDD (e2e), full config examples, BDD feature structure, tagging strategy, CI integration
  - `sections/onboarding/environment-configuration.md` (M4) — Environment management: Secrets Manager, SSM, local .env setup script, Docker build-time vs runtime vars, adding new vars
  - `sections/ci-cd/butler-feature-sandboxes.md` (M5) — Butler buildspec-ci.yaml guide: CodeArtifact auth, branch naming, sandbox URLs, stack lifecycle, cleanup

- **Tutorial updates:**
  - Part 4 now links to all infrastructure guides with a summary of steps needed
  - Part 5 now links to all platform capability guides with integration order
  - "What's Next" updated to reflect remaining gaps (monitoring, Sanity, performance, security)
  - Removed placeholder TODO comments from Parts 4 and 5

### Why
The gap analysis identified 7 medium-priority items that slow teams down and cause inconsistency. With the high-priority gaps (H1-H5) filled yesterday, these medium-priority sections complete the onboarding path. A new developer can now follow the tutorial from start to finish with detailed guides for every step.

### Sources used
- **Repos read:**
  - `hema-design-system/` — package.json, packages/tailwindcss-presets, packages/components-react, packages/assets, packages/design-tokens, examples/ssr-example (README, package.json, postcss.config)
  - `omni-web-content-frontend/src/` — package.json, postcss.config.mjs, styles/globals.css, vitest.config.mts, vitest.setup.ts, playwright.config.ts, middleware.ts, i18n/routing.ts, i18n/request.ts, e2e/features/, e2e/steps/, scripts/environment-variables.sh, buildspec-ci.yaml
- **No Confluence pages fetched** (repo content was sufficient for these topics)
- **No skills activated** (direct repo reading provided all implementation details)

### Gaps remaining (low priority)
- L1: Monitoring & Observability (alarms, logging, AlertPublisher)
- L2: Sanity CMS integration pattern (content modeling, GROQ, draft mode)
- L3: Performance optimization (caching, CDN, Core Web Vitals)
- L4: Security (WAF, CSP headers, security scanning)
- L5: CodeArtifact login setup
- L6: Commit conventions (commitlint)
- L7: CODEOWNERS setup

### Next steps
- Write monitoring/observability guide (uses @hema/monitoring-constructs, AlertPublisher)
- Write Sanity CMS integration guide (repositories/sanity/ patterns)
- Consider creating a "Quick Reference Card" — single-page cheat sheet for common commands
- Validate all guides against omni-web-catalog-pdp to ensure patterns are generalizable

### What changed
- **Tutorial fixes:**
  - Changed `app/` directory references to `src/` (matches actual repos)
  - Updated Node.js version from "18 or 20" to "22 or later"
  - Updated `create-next-app` command to use `src` directory name
  - Updated repository structure diagrams to reflect `src/`
  - Added Dockerfile to the updated structure diagram

- **New sections written (from actual repo implementations):**
  - `sections/infrastructure/cdk-infrastructure.md` (H1) — Full CDK architecture guide with EcsNextJsBundle, runtime stack, pipeline stack, and deployment model
  - `sections/gateway/gateway-registration.md` (H2) — Gateway registration with route config format, CDK integration, rollout percentages, and preview URLs
  - `sections/libraries/web-shell-integration.md` (H3) — Web Shell integration guide covering all 5 packages, installation, Shell props, analytics, and search
  - `sections/gateway/multi-zone-config.md` (H4) — Multi-zone next.config.ts setup with deriveZoneConfig utility, security headers, and zone identification
  - `sections/infrastructure/docker-standalone.md` (H5) — Docker/standalone build guide with Dockerfile pattern, build-time vs runtime env vars, and BuildKit secrets

### Why
The gap analysis identified 5 high-priority gaps that block new team onboarding. Teams following the tutorial hit dead ends at Part 4 (CDK infrastructure) and Part 5 (platform capabilities). These sections fill those gaps with practical, code-backed guidance derived from the actual omni-web-content-frontend implementation.

### Sources used
- `omni-web-content-frontend` — CDK stacks, Dockerfile, next.config.ts, gateway config
- `omni-web-app-shell-library` — All 5 package READMEs, monorepo package.json
- `omni-web-gateway` — Architecture docs, routing flows documentation
- `omni-web-gateway-api` — README and package.json

### Gaps remaining (medium priority)
- M1: HDS step-by-step integration (Tailwind v4, presets)
- M2: i18n setup (next-intl + multi-domain)
- M3: Testing strategy (Vitest + Playwright BDD)
- M4: Environment configuration (SSM + Secrets Manager patterns)
- M5: Butler buildspec-ci.yaml guide
- M6: Monitoring setup (alarms, logging, AlertPublisher)
- M7: Sanity CMS integration pattern

### Next steps
- Write HDS integration guide (M1)
- Write Butler/buildspec guide (M5)
- Write testing strategy document (M3)
- Link new sections from the tutorial Parts 4 and 5

---

## [2026-05-28] - Comprehensive gap analysis from repo exploration

### What changed
- Created detailed gap analysis (`audit/gap-analysis.md`) by reading actual repo implementations
- Compared Golden Path docs (master v18, tutorial v27) against 7 repos
- Identified 5 high-priority, 7 medium-priority, and 6 low-priority gaps
- Documented the `app/` vs `src/` discrepancy and outdated Node.js version in tutorial
- Mapped source of truth for each topic area

### Why
The Golden Path tutorial stops at Part 3 (scaffold Next.js) but teams need Parts 4-5 to actually
deploy. The repos contain mature implementations (ECS, gateway registration, web shell, monitoring)
that are completely undocumented. New teams would hit dead ends trying to follow the current guide.

### Key findings
- CDK infrastructure (ECS + ALB + Docker + VPC origins) is undocumented
- Gateway registration system (routes, zones, rollout) is undocumented
- Web Shell library (5 packages, v3.0.0) integration is undocumented
- Tutorial says `app/` directory but repos use `src/`
- Tutorial says Node 18/20 but repos require >=22

### Next steps
- Fix immediate discrepancies (app→src, Node version)
- Write Part 4: CDK Infrastructure guide
- Write Gateway Registration section
- Write Web Shell integration guide
- Document multi-zone next.config.ts pattern

---

## [2026-05-28] - Initial sync from Confluence

### What changed
- Synced Golden Path master page (v18) from Confluence COCO space
- Synced Tutorial page (v27) from Confluence COCO space
- Created this folder structure for iterative work
- Ran initial gap analysis

### Why
Starting a structured iteration process to improve the Golden Path documentation.
The goal is to identify what's missing, what's outdated, and what doesn't align with
the actual state of the repos and platform.

### Gaps identified
See `audit/gap-analysis.md` for the full analysis.

### Next steps
- Review gap analysis and prioritize improvements
- Start filling in missing sections (infrastructure details, web-shell integration, gateway registration)
- Validate tutorial against actual repo structure
