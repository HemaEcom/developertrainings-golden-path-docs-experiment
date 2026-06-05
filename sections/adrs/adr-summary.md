# Architecture Decision Records — Summary & Golden Path Alignment

> **Source**: `ezex-handbook/confluence/hema-architecture/adrs/`
> **Total ADRs**: 20 numbered + ~10 unnumbered drafts

## ADR Index

| # | Title | Status | Golden Path Coverage |
|---|-------|--------|---------------------|
| 0001 | Build a header/footer component | DRAFT | ✅ Covered in `web-shell-integration.md` |
| 0002 | Using Sanity CMS for site configuration | IN PROGRESS | ✅ Covered in `cms/content-modeling.md` (Shell Configuration) |
| 0003 | Teams SHOULD use Next.js | DECIDED | ✅ Covered in tutorial (Part 3) |
| 0004 | Session sharing between SFCC and Next.js | IN PROGRESS | ✅ Covered in `data-apis/session-sharing.md` |
| 0005 | Use OpenNext for account pages | DECIDED | ✅ Both approaches valid — see below |
| 0006 | Interactive behavior in React component library | DECIDED | ✅ Covered in `hds-integration.md` |
| 0007 | Guidelines on client components in design system | DECIDED | ✅ Implicitly covered |
| 0008 | Use PODS to get product data | DECIDED | ✅ Covered in `data-apis/overview.md` + `data-apis/pods-integration.md` |
| 0009 | Use Sanity directly for editorial content | DECIDED | ✅ Covered in `cms/mfe-integration.md` |
| 0010 | CMS NOT to consume Bynder directly | DECIDED | ✅ Covered in `cms/dam-sync.md` |
| 0011 | Use Newsletter API via Kong | DECIDED | ⚠️ Not in Golden Path — domain-specific |
| 0012 | Server actions vs API routes | DECIDED | ✅ Covered in `onboarding/server-actions-vs-api-routes.md` |
| 0013 | Use CloudFront Functions for gateway router | DECIDED | ✅ Covered in `gateway/gateway-registration.md` |
| 0014 | CI/CD strategy | IN PROGRESS | ✅ Covered in `ci-cd/` section |
| 0015 | Auth with API management (Kong) | DECIDED | ✅ Covered in `data-apis/kong-authentication.md` |
| 0016 | Multi-zone support | IN PROGRESS | ✅ Covered in `gateway/multi-zone-config.md` |
| 0017 | URL namespace structure | DECIDED | ✅ Covered in `gateway/multi-zone-config.md` |
| 0018 | Release flow for Tompouce (HDS) | DECIDED | ✅ Covered in `hds-integration.md` |
| 0019 | Analytics integration | DONE | ✅ Covered in `web-shell-integration.md` (analytics package) |
| 0020 | MFE protection at edge | — | ✅ Covered in `security/security-headers-waf.md` |
| — | Federated sitemap architecture | — | ✅ Covered in `gateway/federated-sitemaps.md` |
| — | Consistent logging in MFEs | — | ✅ Covered in `monitoring/observability.md` |
| — | CloudFront flat rate pricing | — | N/A (cost decision, not dev-facing) |
| — | Bazaarvoice integration | — | N/A (domain-specific) |
| — | Domain-based locale routing | — | ✅ Covered in `i18n-setup.md` |
| — | Visual regression testing for Tompouce | — | ⚠️ Not in Golden Path |
| — | Accessibility testing for Tompouce | — | ⚠️ Not in Golden Path |

---

## Gaps Identified from ADR Review

### 1. ADR-0005: Two Deployment Models (ECS vs OpenNext)

**ADR-0005** decided to use **OpenNext** (Lambda-based serverless) for account pages, while noting that CoFi uses ECS for content pages. Both are valid deployment approaches on the Golden Path.

| Model | Best For | Trade-offs |
|-------|----------|------------|
| **ECS Fargate + Docker** | High-traffic MFEs, complex SSR, long-running requests, consistent latency | Higher baseline cost, more operational control |
| **OpenNext (Lambda)** | Small/medium MFEs, bursty traffic, cost-sensitive services, fast sandbox creation | Cold starts (mitigated by warmer), Lambda timeout limits, pay-per-request |

**Current usage**:
- `omni-web-content-frontend` → ECS (high traffic, content pages)
- `omni-web-catalog-pdp` → ECS (high traffic, product pages)
- `omni-web-myaccount-frontend` → OpenNext/Lambda (lower traffic, account pages)

**When to choose which**:
- Choose **ECS** if your MFE has sustained high traffic, needs consistent sub-100ms latency, or has complex server-side processing
- Choose **OpenNext** if your MFE has bursty/low traffic, benefits from pay-per-request pricing, or needs the fastest possible sandbox creation/deletion

Both models integrate with Butler, CDK, and the gateway registration system. The Golden Path infrastructure guide (`cdk-infrastructure.md`) documents the ECS pattern in detail. OpenNext uses SST constructs with a similar CDK integration pattern.

**Action needed**: Document the OpenNext deployment pattern as an alternative in the infrastructure section.

---

### 2. ⚠️ Server Actions vs API Routes (ADR-0012)

**Decision**: Use server actions by default, unless the API is meant to be accessed by a different application.

**Current state in repos**:
- Content frontend: Uses API routes for draft mode (`/api/draft-mode/enable`), health checks (`/api/health`), sitemaps
- PDP: Uses server actions for mutations (add to cart, newsletter), API routes for health

**Missing from Golden Path**: When to use server actions vs API routes. This is a practical decision every developer faces.

**Recommendation**: Add a brief section to the Quick Reference Card or a new how-to guide.

---

### 3. ⚠️ Kong API Authentication (ADR-0015)

**Decision**: Implement a separate secret where a fresh authentication token is stored and rotated independently. Service token is never loaded to the app directly.

**Current state in repos**:
- PDP uses `KongAuthenticator` class that fetches credentials from `AUTH_SECRET` env var
- Token rotation handled at runtime (5-hour lifespan)
- Credentials stored in Secrets Manager, injected as ECS secrets

**Missing from Golden Path**: How to authenticate with Kong-managed APIs. Any MFE that needs to call backend services (PODS, Newsletter, Commerce) needs this pattern.

**Recommendation**: Create `sections/data-apis/kong-authentication.md`

---

### 4. ✅ Federated Sitemap Architecture — NOW COVERED

Documented in `sections/gateway/federated-sitemaps.md`. Covers the gateway-owned sitemap index, zone replacement keys, MFE requirements, and the SFCC migration sequence.

---

### 5. ⚠️ PODS Integration Pattern (ADR-0008)

**Decision**: Use PODS GraphQL API for product data (pricing, promotions, characteristics).

**Current state in repos**:
- PDP uses Apollo Client with `@apollo/client-integration-nextjs`
- Kong OAuth authentication for API access
- Store IDs per country region (NL: 0755, DE: 0751, FR: 0759, BE: 0756)

**Missing from Golden Path**: How to integrate with PODS. Any MFE rendering product data needs this.

**Recommendation**: Create `sections/data-apis/pods-integration.md`

---

### 6. ⚠️ Visual Regression & Accessibility Testing

Two ADRs discuss testing strategies for Tompouce (HDS) but these patterns aren't documented for MFE teams:
- Visual regression testing strategy
- Automated accessibility testing strategy

**Missing from Golden Path**: Accessibility testing patterns for MFE teams (not just the design system).

---

## Key Architectural Decisions That ARE Well-Covered

These ADRs are fully reflected in the Golden Path documentation:

| Decision | Where Documented |
|----------|-----------------|
| Next.js as standard framework | Tutorial Part 3 |
| Shared header/footer via Web Shell | `libraries/web-shell-integration.md` |
| Sanity for editorial content + config | `cms/` section (6 docs) |
| Bynder → Kafka → Sanity (not direct) | `cms/dam-sync.md` |
| CloudFront Functions for routing | `gateway/gateway-registration.md` |
| Multi-zone architecture | `gateway/multi-zone-config.md` |
| URL namespace (`_zones/`, `_platform/`) | `gateway/multi-zone-config.md` |
| Centralized analytics via shell | `libraries/web-shell-integration.md` |
| Consistent logging (`@hema/monitoring-logger`) | `monitoring/observability.md` |
| MFE protection (WAF, VPC origins) | `security/security-headers-waf.md` |
| Domain-based locale routing | `onboarding/i18n-setup.md` |
| HDS release flow (manual + RC auto) | `libraries/hds-integration.md` |
| Client components guidelines | Implicit in HDS docs |

---

## Recommended New Sections

Based on the ADR gap analysis, these sections would complete the Golden Path:

| Priority | Section | Covers ADRs |
|----------|---------|-------------|
| **High** | `sections/data-apis/kong-authentication.md` | ADR-0015 |
| **High** | `sections/data-apis/pods-integration.md` | ADR-0008 |
| **Medium** | `sections/onboarding/server-actions-vs-api-routes.md` | ADR-0012 |
| **Medium** | ~~`sections/gateway/federated-sitemaps.md`~~ ✅ Done | Federated sitemap ADR |
| **Low** | `sections/ci-cd/accessibility-testing.md` | Accessibility ADR |
| **Low** | Note about ADR-0005 superseded by ECS | ADR-0005 |

---

## ADR Process Reference

### Creating a New ADR

ADRs follow this template (from `HEM100-ADR-templateadr.md`):

```markdown
# HEM100-ADR-XXXX: Title

| Field | Value |
|-------|-------|
| **ADR #** | HEM100-ADR-XXXX |
| **Status** | Draft / In Progress / Decided / Superseded |
| **Owner** | Name |
| **Contributors** | Names |
| **Problem** | One-line problem statement |
| **Decision** | One-paragraph decision summary |

## Problem
Describe the problem and its impact on HEMA.

## Analysis
Describe considered solutions with pros/cons.

## Decision
Describe the taken decision in detail.

## Consequences
Describe the consequences of the decision.

## References
Links to related documents.
```

### ADR Statuses
- **Draft** — Under discussion
- **In Progress** — Being implemented
- **Decided** — Approved and implemented
- **Superseded** — Replaced by a newer decision

### Where ADRs Live
- **Confluence**: COCO space → Architecture → ADRs (page ID: 5997002786)
- **Local sync**: `ezex-handbook/confluence/hema-architecture/adrs/`
