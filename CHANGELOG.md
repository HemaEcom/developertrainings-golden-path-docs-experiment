# Golden Path - Changelog

Track iterations, changes, and decisions made to the Golden Path documentation.

## Format

Each entry follows:
```
## [YYYY-MM-DD] - Brief title
### What changed
```

## Conventions

- **D2 diagrams:** Always use `direction: down` (vertical/top-down). Horizontal layouts are too compressed and hard to read in the Starlight page width.

---

## [2026-06-05] - Iterate Data & APIs section: reorder, diagrams, narrative
### What changed
- Set sidebar ordering: Overview (1) → Kong Authentication (2) → PODS Integration (3) → Session Sharing (4)
- Rewrote Overview with d2 diagram showing MFE → Kong → backends flow and "What Data Comes From Where" table
- Replaced ASCII diagram in Kong Authentication with d2 (AWS Secrets Manager icon)
- Replaced ASCII diagram in PODS Integration with d2
- Replaced ASCII diagram in Session Sharing with d2
- Added direct ADR links (ADR-0008 → page 6223953921, ADR-0004 → page 6000803842)
- Added transition note to Session Sharing (it's a migration-era pattern)
- Tightened all pages: removed redundant prose, kept actionable content
### Why
- Reading order matters: understand the API landscape → learn auth → integrate PODS → understand session sharing
- d2 diagrams (vertical, per convention) replace hard-to-read ASCII art
- Session sharing is a transition pattern, should be clearly marked as such

---

## [2026-06-05] - Iterate Infrastructure section: narrative, order, AWS icons
### What changed
- Rewrote `cdk-infrastructure.md` with a clear intro ("How MFEs Run on AWS"), better narrative flow
- Added sidebar ordering: CDK Infrastructure (1) → Docker & Standalone (2)
- Added AWS icons to the architecture diagram (via d2 `icon` + `shape: rectangle`)
- Simplified the page: removed redundant code, kept what developers need to understand and deploy
- Added "Traffic flow" one-liner and "Next Steps" links at the bottom
- Tightened Docker page intro
### Why
- Infrastructure is complex — the intro should orient developers before diving into CDK code
- AWS icons make the diagram immediately recognizable
- Explicit ordering creates a reading path: understand the architecture → understand how the app is packaged

---

## [2026-06-05] - Iterate CMS section: reorder, tighten narrative, focus on facts
### What changed
- Set explicit sidebar ordering: Overview (1) → Content Modeling (2) → MFE Integration (3) → Content Flow (4) → DAM Sync (5) → Deployment (6)
- Rewrote all 6 CMS docs to focus on facts and current implementation state
- Added "Integration Status" note on overview (CMS is still being actively integrated)
- Replaced ASCII diagrams with d2 diagrams (vertical layout per convention)
- Removed aspirational/speculative content — kept only what exists in the repos
- Tightened narrative: removed redundant introductions, kept actionable info
- Added section guide table to overview for navigation
### Why
- CMS integration is still in progress — docs should reflect facts, not plans
- Developers need a clear reading order (overview → schemas → consumption → preview → DAM → deploy)
- Vertical d2 diagrams are more readable than ASCII art boxes
### Sources used
- Read all 6 existing CMS docs
- Cross-referenced with `omni-cms-composable-cms` and `omni-web-content-frontend` repo structures

---

## [2026-06-05] - Federated Sitemaps: add d2 diagram (vertical)
### What changed
- Replaced text-only "How It Works" in `gateway/federated-sitemaps.md` with a vertical d2 diagram showing crawler → gateway → sources flow

---

## [2026-06-05] - Remove dedicated Libraries section
### What changed
- Removed `src/content/docs/golden-path/libraries/` (web-shell-integration.md, hds-integration.md)
- Removed "Libraries" sidebar entry from `astro.config.mjs`
- Removed built `docs/golden-path/libraries/` output
### Why
- Web Shell and HDS are already covered in the Tutorial's "06 — Core Capabilities" section
- Having a separate Libraries section was redundant; mentioning them in the capabilities context is sufficient for now
### Gaps remaining
- If libraries grow significantly or need standalone reference docs, consider re-adding as a dedicated section later

---

## [2026-06-05] - Reorder and improve Gateway section narrative
### What changed
- Set sidebar order: Gateway Registration (1) → Multi-Zone Config (2) → Federated Sitemaps (3)
- Simplified Gateway Registration: removed RAM/cross-account details (implementation detail handled by CDK)
- Simplified the "How It Works" diagram to focus on what developers interact with
- Added narrative connectors between pages ("Next →", "← Previous")
- Added note to Federated Sitemaps that it only applies to publicly indexable pages
- Removed RAM from the checklist
### Why
- Gateway Registration is the most important concept — it should come first
- RAM is an internal detail developers never have to think about
- Federated Sitemaps is niche, should be last

---

## [2026-06-05] - Expand Web Shell documentation to reflect its full scope
### What changed
- Updated `src/content/docs/golden-path/tutorial/06-capabilities.md`:
  - Renamed section from "Web Shell (Header, Footer, Analytics)" to "Web Shell (Shared Application Layer)"
  - Added full capabilities table (geo-popup, consent, global banner, search, session, basket, error view, scroll-to-top)
  - Updated d2 diagram to show all Shell responsibilities
  - Added `platform-api` and `api-client` packages to the package list
- Updated `src/content/docs/golden-path/libraries/web-shell-integration.md`:
  - Rewrote "What Is the Web Shell?" to position it as the shared application layer
  - Added capabilities table, expanded d2 diagram, updated packages table
  - Added MFE component diagram image
- Updated `sections/libraries/web-shell-integration.md` with same improvements
- Copied `MFE_component-diagram.png` to `public/images/` for Starlight use
### Why
- The Shell has evolved well beyond header/footer/analytics — it now handles consent, geo-detection, search, session, global banners, and more
- Documentation was underselling the Shell's role as the shared application layer
### Sources used
- MFE component diagram (`docs/MFE_component-diagram.png`)
- `omni-web-app-shell-library` repo: Shell.tsx exports, platform-api exports, analytics exports

---

## [2026-06-05] - Add HDS Storybook and repo links to tutorial section 6
### What changed
- Added deployed Storybook URL and GitHub repo link to the HDS section in `06-capabilities.md`
### Why
- Developers need quick access to browse available components before integrating them

---

## [2026-06-05] - Clarify ECS Fargate vs OpenNext deployment models in tutorial
### What changed
- Updated `src/content/docs/golden-path/tutorial/01-overview.md`:
  - Replaced single-line "Each MFE runs as a Docker container on ECS Fargate" with expanded explanation of both deployment models
  - Updated checklist to mention both ECS Fargate and OpenNext/Lambda options
- Updated `src/content/docs/golden-path/tutorial/04-nextjs-setup.md`:
  - Added a callout note in the Dockerfile section clarifying that ECS is the default for heavy-traffic MFEs, with OpenNext as alternative for lighter services
- Updated `tutorial.md` (root):
  - Updated checklist to mention both deployment options
  - Added deployment model clarification note before the Dockerfile section
### Why
- The documentation previously implied ECS Fargate was the only deployment model
- Some MFEs (e.g., omni-web-myaccount-frontend) use OpenNext/Lambda for serverless deployment
- New developers need to understand the decision criteria for choosing between models
- ECS Fargate remains the recommended default for heavy, high-traffic frontend pages
### Sources used
- ADR-0005 (documented in `sections/adrs/adr-summary.md`) — ECS vs OpenNext decision
- Existing knowledge of omni-web-myaccount-frontend using OpenNext pattern
### Gaps remaining
- Full OpenNext deployment tutorial/guide not yet written (documented pattern is ECS-only)
- Infrastructure section (`sections/infrastructure/`) needs an OpenNext-specific page

---

## [2026-06-02] - Reorder tutorial: Local Development before Capabilities and Deployment
### What changed
- Moved Local Development from step 6 (last) to step 5 (right after Next.js setup)
- Moved Core Capabilities from step 4 to step 6
- Deployment stays last at step 7
- Renamed files: `05-local-dev.md`, `06-capabilities.md`, `07-deployment.md`
### Why
- A developer should run their app locally and verify the basic setup works before layering in HDS, Web Shell, CMS, etc.
- Natural flow: scaffold → setup app → verify it runs → integrate capabilities → deploy
### Sources used
- Discussion about tutorial ordering priorities

---

## [2026-06-02] - Tutorial cross-validation against repo implementations
### What changed
- **next.config.ts**: Rewrote to show actual `deriveZoneConfig()` + `withNextIntl()` pattern (not plain `assetPrefix` string). Added production rewrite that strips zone prefix. Added `serverActions.allowedOrigins` with gateway dev domains.
- **Dockerfile**: Replaced single-pattern with two documented patterns (PDP-style ARG placeholders vs Content-style BuildKit secrets). Noted port 3000 vs 80 difference.
- **App Router structure**: Updated to show actual `src/` as Next.js root (not `app/`). Added `clients/`, `server-actions/`, `stores/`, `messages/` directories. Showed `(shop)` route group as the correct Shell location.
- **HDS section**: Added version note (2.1.0-rc.*), fixed postcss.config.mjs to use `const postcssConfig` pattern, fixed body className to match actual PDP implementation with HDS utility classes.
- **Web Shell section**: Major rewrite — Shell is in route group layout `[locale]/(shop)/layout.tsx`, NOT root layout. Added package table with all 5 packages (shell, core, analytics, api-client, platform-api). Root layout is minimal (fonts + NextIntlClientProvider only).
- **i18n section**: Updated routing.ts to match actual implementation with `stripProtocol()` helper, env-var-based domains (`NEXT_PUBLIC_DOMAIN_NL`/`NEXT_PUBLIC_DOMAIN_COM`), local defaults. Updated middleware matcher to include `_zones/.+/_next/image` exclusion.
- **buildspec-ci section**: Showed both Content (explicit CodeArtifact, Node 22) and PDP (co:login script, Node 24) patterns with explanation of differences.
- **Local dev section**: Added multi-domain testing tip with `/etc/hosts` configuration.
- **Summary table**: Expanded to include actual versions from both repos, added React 19, Tailwind v4, zustand, @hema/monitoring-logger columns.
- **Apollo section**: Updated to v4 (`@apollo/client@^4`).
- **Dev proxying section**: Simplified to reference the next.config.ts template, added SFCC proxy example from PDP.
- **Scaffold step**: Added note that Next.js app lives in `src/` dir (not `app/`).

### Why
- The tutorial had several simplifications and inaccuracies compared to the actual repo implementations. New developers following the guide would hit configuration issues.
- The Shell placement was incorrect (root layout vs route group layout) — this is a fundamental architectural difference.
- The i18n routing was hardcoded to `www.hema.nl` instead of using env vars, which breaks local development.
- The Dockerfile section didn't show the real multi-secret pattern needed for static generation.

### Sources used
- `omni-web-catalog-pdp/src/next.config.ts` — actual Next.js config with zone config, intl plugin, rewrites
- `omni-web-catalog-pdp/src/package.json` — actual dependency versions (Next 16, React 19, Apollo 4, etc.)
- `omni-web-catalog-pdp/src/middleware.ts` — actual middleware implementation
- `omni-web-catalog-pdp/src/Dockerfile` — PDP Docker pattern (alpine, ARG placeholders)
- `omni-web-catalog-pdp/src/app/layout.tsx` — root layout (minimal, fonts + NextIntl)
- `omni-web-catalog-pdp/src/app/[locale]/(shop)/layout.tsx` — Shell layout (route group)
- `omni-web-catalog-pdp/src/i18n/routing.ts` — actual routing with env-var domains
- `omni-web-catalog-pdp/src/postcss.config.mjs` — actual postcss config
- `omni-web-catalog-pdp/buildspec-ci.yaml` — PDP Butler buildspec (Node 24, co:login)
- `omni-web-content-frontend/src/next.config.ts` — Content config with headers (No-Vary-Search)
- `omni-web-content-frontend/src/package.json` — Content deps (Next 15, vitest 3, etc.)
- `omni-web-content-frontend/src/middleware.ts` — Content middleware (same pattern)
- `omni-web-content-frontend/src/Dockerfile` — Content Docker (slim, BuildKit secrets)
- `omni-web-content-frontend/src/i18n/routing.ts` — Content routing (same structure)
- `omni-web-content-frontend/buildspec-ci.yaml` — Content Butler buildspec (Node 22, explicit token)
- `omni-web-app-shell-library/library/packages/` — Shell package list (shell, core, analytics, api-client, platform-api, examples)
- `hema-design-system/packages/` — HDS packages (components-react, assets, tailwindcss-presets, design-tokens, css)

### Gaps remaining
- `deriveZoneConfig()` utility: need to document or provide template for this function
- PDP uses Next.js 16 (latest), Content still on 15 — document the migration path
- Content Frontend uses `next-sanity@^9` while PDP uses `next-sanity@^12` — version gap to document
- Content has `instrumentation.ts` (OpenTelemetry) — not yet documented
- Content has `@hema/omni-web-app-shell-platform-api` — role not explained
- The CDK `lib/` infrastructure (runtime-stack, pipeline-stack) differences are not yet documented in the tutorial

---

## [2026-06-01] - CI/CD Pipeline Overview with D2 diagram
### What changed
- Rewrote `src/content/docs/golden-path/tutorial/03-cicd-pipeline.md` — added high-level introduction explaining what the pipeline is and how it flows
- Added D2 diagram showing Developer → GitHub → Pipeline (Synth → Self-Mutate → Deploy → E2E) → Running Service
- Added "Two Stacks, One Repo" explanation with factory/product analogy
- Added link to the deep-dive reference page
- Created `src/content/docs/golden-path/ci-cd/pipeline-overview.md` — full technical reference with detailed D2 architecture diagram
- Documented each pipeline stage, build environment, design decisions, and how to add a new pipeline
### Why
- The tutorial page jumped straight into commands without explaining what the pipeline is or how it flows
- New developers need a visual mental model before running `cdk deploy`
- The D2 diagram makes the flow immediately understandable
### Sources used
- `omni-web-catalog-pdp/lib/pipeline/pipeline-stack.ts` — full pipeline definition
- `omni-web-catalog-pdp/bin/solution.ts` — CDK app entry point
- `omni-web-catalog-pdp/buildspec-ci.yaml` — Butler buildspec
- `omni-web-catalog-pdp/package.json` — Node.js version, scripts
### Gaps remaining
- Production pipeline (multi-account with approval gates) not yet documented
- Rollback procedures not documented

---

## [2026-05-29] - Added cake image to Golden Path master doc
### What changed
- Added `![Golden Path Cake](/images/cake.png)` to `golden-path-master.md` as a banner image below the header
### Why
- User added a cake image to `public/images/` and requested it be included in the main Golden Path document
### Sources used
- Local file: `public/images/cake.png`
### Gaps remaining
- None

---

## Previous entries
### Why
### Gaps identified
### Next steps
```

---

## [2026-05-29] - Tutorial split into sub-pages + cross-reference corrections

### What changed
- **Split:** Single `tutorial.md` → 7 sub-pages in `src/content/docs/golden-path/tutorial/`:
  - `01-overview.md` — Intro, prerequisites, table of contents
  - `02-foundation.md` — Template, AWS accounts, clone
  - `03-cicd-pipeline.md` — CDK deploy, Butler
  - `04-nextjs-setup.md` — Scaffold, next.config, Dockerfile, routes
  - `05-capabilities.md` — All 12 capabilities
  - `06-deployment.md` — buildspec, pipeline flow, env vars
  - `07-local-dev.md` — Run locally, summary table, what's next
- **Updated sidebar:** `astro.config.mjs` now uses `autogenerate` for the Tutorial section
- **Fixed `next.config.ts`:** Added `createNextIntlPlugin()` wrapper and correct `/_zones/{service-id}` pattern (was using a generic env var)
- **Fixed CSS setup:** Changed `@import 'tailwindcss'` → `@import 'tailwindcss' prefix(hds)` and added required `@source` directives for HDS and Shell packages
- **Fixed Shell integration:** Uses `baseClient` import (not undefined `sanityClient`), added route group note
- **Reduced duplication:** CMS, Gateway, Kong, Apollo, and Testing sections now show integration steps only and link to detailed guides instead of repeating full implementations

### Why
Cross-referencing with the actual repos revealed:
1. The CSS setup was wrong — both repos use `prefix(hds)` and `@source` directives
2. The `next.config.ts` was missing the `next-intl` plugin wrapper (both repos use it)
3. The `assetPrefix` pattern was oversimplified — real repos derive it from `serviceId` via `deriveZoneConfig()`
4. Several sections duplicated content already in detailed guide pages

### Sources used
- `omni-web-content-frontend/src/utils/zone-config.ts` — actual assetPrefix derivation
- `omni-web-content-frontend/src/styles/globals.css` — real CSS with prefix + @source
- `omni-web-content-frontend/src/postcss.config.mjs` — real postcss config
- `omni-web-content-frontend/src/next.config.ts` — createNextIntlPlugin wrapper
- `omni-web-catalog-pdp/src/styles/global.css` — confirms same CSS pattern
- `omni-web-catalog-pdp/src/postcss.config.mjs` — confirms same postcss pattern

---

## [2026-05-29] - Tutorial rewrite: Complete MFE capabilities coverage

### What changed
- **Rewritten:** `tutorial.md` — Complete rewrite from a partial/TODO-heavy tutorial to a comprehensive guide covering all 8 core capabilities every HEMA MFE needs
- **Rewritten:** `src/content/docs/golden-path/tutorial.md` — Starlight version synced with the same content
- **Updated (PDP iteration):** Added 8 more capabilities (7–14) discovered from `omni-web-catalog-pdp`:
  - Server Actions pattern with `allowedOrigins` config
  - Kong OAuth2 authentication (KongAuthenticator class)
  - Apollo Client for GraphQL/PODS with `registerApolloClient`
  - Zustand for client-side state management
  - Route Groups `(shop)` for layout variants
  - Dev API proxying via Next.js rewrites
  - Updated summary table with all 19 capabilities

### Why
The previous tutorial had:
- Part 4 (Infrastructure) was just a link with a TODO comment
- Part 5 (Platform Capabilities) only mentioned HDS with a TODO
- No code examples from actual implementations
- Missing capabilities: i18n, CMS, testing, health checks, env config, local dev

After the initial rewrite based on `omni-web-content-frontend`, cross-referencing with `omni-web-catalog-pdp` revealed additional patterns that are essential for MFEs that consume backend APIs (product data, commerce services). These are not optional — any MFE calling PODS or Commerce APIs needs Kong auth and Apollo.

### Sources used
- **Repos read (content-frontend):**
  - `omni-web-content-frontend/src/package.json`, `next.config.ts`, `middleware.ts`, `app/layout.tsx`, `i18n/routing.ts`, `Dockerfile`, `buildspec-ci.yaml`
- **Repos read (catalog-pdp):**
  - `omni-web-catalog-pdp/src/package.json` — Next.js 16, Apollo Client, Zustand, embla-carousel
  - `omni-web-catalog-pdp/src/next.config.ts` — `outputFileTracingRoot`, dev rewrites, `serverActions.allowedOrigins`
  - `omni-web-catalog-pdp/src/middleware.ts` — same i18n pattern, simpler matcher
  - `omni-web-catalog-pdp/src/app/layout.tsx` — root layout without Shell (Bazaarvoice script)
  - `omni-web-catalog-pdp/src/app/[locale]/(shop)/layout.tsx` — Shell in route group
  - `omni-web-catalog-pdp/src/services/auth/kong-authenticator.ts` — full Kong OAuth2 implementation
  - `omni-web-catalog-pdp/src/clients/graphql/apollo-client-rsc.ts` — Apollo + Kong integration
  - `omni-web-catalog-pdp/src/services/pods/pods-service.ts` — PODS service with Result pattern
  - `omni-web-catalog-pdp/src/server-actions/` — 5 server action modules
  - `omni-web-catalog-pdp/src/stores/` — Zustand store pattern
  - `omni-web-catalog-pdp/src/Dockerfile` — node:22-alpine, placeholder build args
  - `omni-web-catalog-pdp/buildspec-ci.yaml` — Node 24, `co:login` pattern
  - `omni-web-catalog-pdp/docker-compose.yml` — local containerized dev
  - `omni-web-catalog-pdp/package.json` — Node >=24, CDK 2.251

### Key differences between content-frontend and catalog-pdp
| Aspect | Content Frontend | Catalog PDP |
|--------|-----------------|-------------|
| Next.js version | 15 | 16 |
| Node.js | 22 | 24 |
| Shell placement | Root layout | Route group `(shop)/layout.tsx` |
| Data source | Sanity CMS (GROQ) | PODS (GraphQL via Apollo) + Sanity |
| API auth | None (Sanity token only) | Kong OAuth2 (client credentials) |
| State management | None | Zustand |
| Server Actions | Newsletter only | Stock, newsletter, PODS, Sanity, commerce |
| Docker base | node:22-slim | node:22-alpine |
| Build secrets | BuildKit secrets (runtime) | Build ARGs (placeholders) |

### Gaps remaining
- Third-party script integration patterns (Bazaarvoice, GTM) — mentioned but not a full guide
- `docker-compose.yml` for local dev — PDP has it, not yet in tutorial
- Result type pattern (`success`/`failure`) — good practice, not yet documented
- Playwright per-locale test projects — PDP runs tests per country

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
