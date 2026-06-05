# Cross-Validation: Content Frontend vs Catalog PDP

> **Purpose**: Verify that Golden Path guides are generalizable across MFEs, not just content-frontend-specific.
> **Repos compared**: `omni-web-content-frontend` (content zone) vs `omni-web-catalog-pdp` (catalog/PDP zone)

## Summary

The Golden Path guides are **valid for both repos**. Both follow the same architecture patterns. Key differences are in the data layer (PODS GraphQL vs GROQ-only) and route matching (slug-based vs regex-based). The infrastructure, deployment, and library integration patterns are identical.

---

## ✅ Patterns That Are Identical

| Pattern | Content Frontend | Catalog PDP | Guide Valid? |
|---------|-----------------|-------------|--------------|
| CDK structure (`lib/`) | `lib/common/`, `lib/components/`, `lib/runtime/`, `lib/pipeline/` | Same | ✅ |
| `EcsNextJsBundle` construct | Yes | Yes | ✅ |
| `GatewayRegistration` construct | Yes | Yes | ✅ |
| `AlertPublisher` (non-temporary only) | Yes | Yes | ✅ |
| VPC origin + RAM share | Yes | Yes | ✅ |
| `output: 'standalone'` | Yes | Yes | ✅ |
| Docker containerization | `src/Dockerfile` | `src/Dockerfile` | ✅ |
| `deriveZoneConfig()` utility | Yes | Yes | ✅ |
| `next-intl` middleware | Yes | Yes | ✅ |
| Sanity client (`next-sanity`, `baseClient`) | Yes | Yes | ✅ |
| `unstable_cache` for microcopy | Yes (300s) | Yes (500s configurable) | ✅ |
| Web Shell (`@hema/omni-web-app-shell-*`) | v3.0.0 | v3.0.0 | ✅ |
| HDS (`@hema/hds-components-react`) | RC versions | RC versions | ✅ |
| Tailwind CSS v4 + `@tailwindcss/postcss` | Yes | Yes | ✅ |
| Vitest for unit tests | Yes | Yes | ✅ |
| Playwright for E2E | BDD style | Per-locale projects | ✅ |
| Butler `buildspec-ci.yaml` | Yes | Yes | ✅ |
| `co:login` for CodeArtifact | Yes | Yes | ✅ |
| Security headers (HSTS, nosniff) | In `next.config.ts` | Not in config (gateway-level) | ⚠️ |
| Health check `/api/health` | Yes | Yes | ✅ |

## ⚠️ Differences to Note

### 1. Node.js Version

| | Content Frontend | Catalog PDP |
|-|-----------------|-------------|
| Requirement | `>=22.0.0` | `>=24.0.0` |
| Butler buildspec | `nodejs: 22` | `nodejs: 24` |

**Impact on guides**: The tutorial should say "Node.js 22 or later" (PDP is ahead).

### 2. Data Layer Architecture

| | Content Frontend | Catalog PDP |
|-|-----------------|-------------|
| Primary data source | Sanity CMS (GROQ) | PODS (GraphQL) + Sanity CMS (GROQ) |
| GraphQL client | None | Apollo Client (`@apollo/client` + `@apollo/client-integration-nextjs`) |
| Authentication | Sanity token only | Kong OAuth (client credentials) for PODS API |
| API proxy | None | Dev rewrites to `BASE_API_URL` for PODS |

**Impact on guides**: The CMS integration guide covers the Sanity side correctly for both. PDP adds a GraphQL/PODS layer on top. A future "Data APIs" section should cover the PODS pattern.

### 3. Gateway Route Configuration

| | Content Frontend | Catalog PDP |
|-|-----------------|-------------|
| Route type | Uses `buildGatewayZones` utility | Uses custom `buildGatewayEnvironments` |
| Route matching | Prefix-based (`_zones/omni-web-content`) | Regex-based (`\\d+\\.html$`) for product pages |
| Config format | `gateway-routes-config.json` (simpler) | `gateway-routes-config.json` (with localized routes support) |
| Rollout groups | Not used | Supported (per-path rollout percentages) |

**Impact on guides**: The gateway registration guide should mention both approaches. The PDP's `buildGatewayEnvironments` is more sophisticated (supports localized routes and rollout groups).

### 4. Sanity Usage Differences

| | Content Frontend | Catalog PDP |
|-|-----------------|-------------|
| Page rendering | Full page from Sanity (flexible components) | Product page from PODS, config from Sanity |
| Draft mode / Live preview | Full implementation | Not used (product data comes from PODS) |
| Sanity queries | Pages, components, microcopy, sitemaps | Headgroup config, PDP carousels, product arrays, microcopy |
| `defineLive` | Yes | No (no live preview needed) |

**Impact on guides**: The CMS content-flow guide is specific to content-frontend. PDP uses Sanity for configuration, not page content.

### 5. State Management

| | Content Frontend | Catalog PDP |
|-|-----------------|-------------|
| Client state | None (server-only) | Zustand (`zustand`) |
| Server actions | None | Yes (`experimental.serverActions`) |

### 6. Security Headers

| | Content Frontend | Catalog PDP |
|-|-----------------|-------------|
| In `next.config.ts` | HSTS, nosniff, referrer-policy, No-Vary-Search | Not configured (relies on gateway) |
| `allowedOrigins` | Not configured | Explicit list for server actions |

**Impact on guides**: The security guide should note that headers can be at MFE level OR gateway level. PDP relies on gateway-level headers.

### 7. Microcopy Pattern

| | Content Frontend | Catalog PDP |
|-|-----------------|-------------|
| Document type | `microcopy` (legacy shared) | `microcopy.omni-web-catalog` (per-service) |
| Cache TTL | 300s (hardcoded) | Configurable via `MICROCOPY_CACHE_TTL` env var |
| Fetch pattern | Locale-based (`lang` + `country` params) | Fetches all, transforms by locale |

**Impact on guides**: The CMS integration guide should mention both patterns. PDP's configurable TTL is the newer approach.

### 8. Project Structure

| | Content Frontend | Catalog PDP |
|-|-----------------|-------------|
| App code location | `src/` | `src/` |
| App router path | `src/app/[locale]/` | `src/app/[locale]/` |
| Repositories | `src/repositories/sanity/` | `src/repositories/{sanity,pods,commercestockinfo,newsletter,business-commerce}/` |
| Clients | Inline in repositories | Separate `src/clients/` layer (graphql, rest, sanity) |

**Impact on guides**: PDP has a more layered architecture (clients → repositories → services). The guides should mention this as the recommended pattern for MFEs with multiple data sources.

---

## Recommendations for Guide Updates

1. **Node.js version**: Change to "22 or later" in all guides
2. **Gateway registration**: Add a note about regex routes and rollout groups (PDP pattern)
3. **Data layer**: Add a brief "PODS Integration" section for MFEs that need product data
4. **Security headers**: Note that headers can be at MFE or gateway level
5. **Microcopy**: Document the per-service pattern (`microcopy.<serviceId>`) as the recommended approach
6. **Architecture layers**: Recommend the clients → repositories → services pattern for complex MFEs

---

## Conclusion

The Golden Path guides are **generalizable**. Both repos follow the same:
- CDK infrastructure pattern (EcsNextJsBundle → GatewayRegistration → AlertPublisher)
- Deployment model (CodePipeline, Butler sandboxes)
- Library integration (Web Shell v3, HDS, next-intl, Tailwind v4)
- CMS integration (next-sanity, baseClient, unstable_cache)

The main difference is that PDP adds a **GraphQL/PODS layer** for product data, which is domain-specific and doesn't invalidate any existing guide. A new team following the Golden Path would successfully set up either type of MFE.
