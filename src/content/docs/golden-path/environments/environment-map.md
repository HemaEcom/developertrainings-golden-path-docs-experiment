---
title: "Environments — Full Landscape Map"
---


> How environments are structured across HEMA100 frontend services.
>
> For general AWS access, account requests, and platform-wide policies, see the [Platform Catalog](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/architecture-principles/reference/platform-catalog/) and [AWS Access Guide](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/aws/aws-access/) in metis-general.

## AWS Accounts

The HEMA100 frontend services share two AWS accounts (one per landscape):

| Account ID | Purpose | Services Deployed |
|------------|---------|-------------------|
| `214061306515` | **Production** landscape | MFEs (prod), Gateway (prod), CMS (prod), Gateway API (prod) |
| `213617179136` | **Non-production** landscape | MFEs (sandbox/test), Gateway (sandbox/beta), CMS (preprod/staging/sandbox), Gateway API (test) |

All services deploy to `eu-central-1` (Frankfurt), except WAF stacks which deploy to `us-east-1` (required for CloudFront).

---

## Environment Naming Model

The `@hema/common-types` library defines the environment model:

```typescript
interface Environment {
  name: string;                    // e.g., "prod", "test1", "feature-cofi-123"
  service: string;                 // e.g., "omni-web-content"
  component: string;               // e.g., "frontend"
  temporary: boolean;              // true for sandboxes (Butler)
  configurationName: string;       // "prod" | "int" | "test" (derived)
  surroundingLandscape: Landscape; // PROD | INT
}
```

| `environmentName` | `configurationName` | `temporary` | Landscape | Account |
|-------------------|--------------------:|:-----------:|-----------|---------|
| `prod` | `prod` | `false` | PROD | Production |
| `int` | `int` | `false` | INT | Production |
| `beta` | `prod` or `int` | `false` | Depends on branch | Production |
| `test1`, `test2`, etc. | `test` | `false` | INT | Non-production |
| `feature-*`, `fix-*`, `chore-*` | `test` | `true` | INT | Non-production |

---

## Per-Service Environment Map

### MFE: omni-web-content-frontend

| Environment | Branch | Trigger | URL Pattern | AWS Account |
|-------------|--------|---------|-------------|-------------|
| **Production** | `main` | Push + manual approval | `www.hema.nl` / `www.hema.com` | Production |
| **Test** (permanent) | `main` | Push | Preview URLs from gateway | Non-production |
| **Sandbox** (temporary) | `feature/*`, `fix/*`, `chore/*` | Butler push | `frontend-<branch>.omni-web-content.ui-test.hema.digital` | Non-production |

**Service identity**: `service=omni-web-content`, `component=frontend`

**SSM parameter paths**:
- Global: `/hema/global/auth`, `/hema/global/business-base-url`, `/hema/global/gateway/account-id`
- Service: `/hema/omni-web-content/frontend/<configName>/log-level`
- Content-specific: `/hema/omni-web-content-frontend/<configName>/sanity/dataset`, `/hema/omni-web-content-frontend/<configName>/base-url`

---

### MFE: omni-web-catalog-pdp

| Environment | Branch | Trigger | URL Pattern | AWS Account |
|-------------|--------|---------|-------------|-------------|
| **Production** | `main` | Push + manual approval | `www.hema.nl/*.html` / `www.hema.com/<locale>/*.html` | Production |
| **Test** (permanent) | `main` | Push | Preview URLs from gateway | Non-production |
| **Sandbox** (temporary) | `feature/*`, `fix/*`, `chore/*` | Butler push | `frontend-<branch>.omni-web-catalog.ui-test.hema.digital` | Non-production |

**Service identity**: `service=omni-web-catalog`, `component=pdp`

**SSM parameter paths**:
- Global: `/hema/global/auth`, `/hema/global/business-base-url`, `/hema/global/allowed-origins`
- Component: `/hema/pdp/sanity/recommender-id`, `/hema/pdp/gtm-id`, `/hema/pdp/microcopy-cache-ttl`

**Secrets**: `/hema/global/auth` (Kong OAuth), `/hema/pdp/sanity` (Sanity tokens)

---

### CMS: omni-cms-composable-cms

| Environment | Branch | Trigger | Studio URL | Dataset | AWS Account |
|-------------|--------|---------|------------|---------|-------------|
| **Production** | `main` | Push | `hema-cms.sanity.studio` | `production` | Production |
| **Pre-production** | `main` | Push | `preprod-hema-cms.sanity.studio` | `preprod` | Non-production |
| **Staging** | `main` | Git tag | `staging-hema-cms.sanity.studio` | `staging` | Non-production |
| **Sandbox** | `feature/*`, `fix/*`, `chore/*` | Push | `<branch>-sandbox-hema-cms.sanity.studio` | `<branch>_sandbox` | Non-production |

**Service identity**: `service=omni-cms`, `component=cms`

**Secrets**: `<stage>/cms-env-vars` (all CMS environment variables bundled in one secret)

**Special behaviors**:
- Sandbox creates a new Sanity dataset automatically (`infrastructure/lib/scripts/create-sandbox.ts`)
- Pre-production pipeline has a branch-deletion webhook (auto-cleanup)
- Staging pipeline is tag-triggered (not push-triggered)
- Production has `terminationProtection: true`

---

### Gateway: omni-web-gateway

| Environment | Branch | Trigger | Domains | AWS Account |
|-------------|--------|---------|---------|-------------|
| **Production** | `main` | Push + manual approval | `www.hema.nl`, `www.hema.com` | Production |
| **Integration** | `integration` | Push | Internal preview domains | Production |
| **Beta** | `beta/*` | Push | Preview domains (prod or int landscape) | Production |
| **Test** (permanent) | `main` | Push | `*.omni-web-gateway.experience-dev.hema.digital` | Non-production |
| **Sandbox** (temporary) | `feature/*` | Butler push | Temporary preview domains | Non-production |

**Service identity**: `service=omni-web-gateway`, `component=router`

**Special behaviors**:
- Beta environment can target either PROD or INT landscape depending on branch
- WAF stack only deployed for prod, int, and beta environments
- Monitoring stack skipped for temporary environments
- CloudFront distributions per domain (NL, COM)

---

### Gateway API: omni-web-gateway-api

| Environment | Branch | Trigger | AWS Account |
|-------------|--------|---------|-------------|
| **Production** | `main` | Push + approval | Production |
| **Test** (permanent) | `main` | Push | Non-production |
| **Sandbox** (temporary) | `feature/*` | Butler push | Non-production |

**Service identity**: `service=omni-web-gateway`, `component=api`

---

### Libraries (omni-web-app-shell-library, hema-design-system)

Libraries don't have runtime environments. They are published to **CodeArtifact**:

| Library | Registry | Scope | Versioning |
|---------|----------|-------|------------|
| Web Shell packages | CodeArtifact (`hema-prod`) | `@hema/omni-web-app-shell-*` | Semantic (3.x) |
| HDS packages | CodeArtifact (`hema-prod`) | `@hema/hds-*` | RC versions (2.1.0-rc.*) |

Published on merge to `main`. Consumed by MFEs via `npm install` after `co:login`.

---

## Environment Flow (Developer Journey)

```
Developer machine (local)
    │
    │ git push feature/cofi-123
    ▼
Butler Sandbox (temporary, non-prod account)
    │  - Auto-created on push
    │  - Auto-deleted on branch merge/delete
    │  - URL: frontend-<branch>.<service>.ui-test.hema.digital
    │
    │ PR merged to main
    ▼
Test Environment (permanent, non-prod account)
    │  - Auto-deployed on push to main
    │  - Preview URLs from gateway registration
    │  - Playwright E2E runs here
    │
    │ (automatic for MFEs, manual approval for gateway)
    ▼
Production (prod account)
    │  - Manual approval step in pipeline
    │  - Deployed to www.hema.nl / www.hema.com
    │  - WAF + monitoring active
    │  - terminationProtection: true
    ▼
Live traffic
```

### CMS-specific flow:

```
Developer machine (local)
    │
    │ git push feature/cofi-123
    ▼
Sandbox (non-prod account)
    │  - New Sanity dataset created: <branch>_sandbox
    │  - Studio deployed: <branch>-sandbox-hema-cms.sanity.studio
    │  - CORS origin added
    │  - Manual approval to delete all resources
    │
    │ PR merged to main
    ▼
Pre-production (non-prod account)
    │  - Dataset: preprod
    │  - Migrations run automatically
    │  - Documents validated
    │
    │ (automatic)
    ▼
Production (prod account)
    │  - Dataset: production
    │  - Migrations run automatically
    │  - Documents validated
    │  - terminationProtection: true
    ▼
Live content
```

---

## SSM Parameter Namespace Convention

```
/hema/
├── global/                              # Shared across all services
│   ├── auth                             # (Secret) Kong OAuth credentials
│   ├── business-base-url                # Internal API base URL
│   ├── business-commerce-base-url       # Commerce API base URL
│   ├── gateway/account-id               # Gateway AWS account ID
│   ├── allowed-origins                  # CORS allowed origins
│   └── basic-auth                       # (Secret) Basic auth for preview
│
├── omni-web-content-frontend/           # Content MFE specific
│   ├── sanity/project-id                # Sanity project ID (shared across stages)
│   ├── sanity/api-version               # Sanity API version
│   ├── sanity                           # (Secret) Sanity tokens
│   ├── <configName>/                    # Per-environment config
│   │   ├── sanity/dataset               # "production" | "preprod" | ...
│   │   ├── sanity/studio-url            # Studio URL for visual editing
│   │   ├── base-url                     # Public domain (hema.nl / hema.com)
│   │   ├── pods-url-path                # PODS API path
│   │   └── retail-media-test-mode       # Feature flag
│   └── <configName>/log-level           # Log level per env
│
├── omni-web-content/frontend/           # Service/component path
│   └── <configName>/log-level
│
├── pdp/                                 # PDP component specific
│   ├── sanity                           # (Secret) Sanity tokens
│   ├── sanity/recommender-id            # Sanity recommender ID
│   ├── gtm-id                           # GTM container ID
│   ├── microcopy-cache-ttl              # Cache TTL (seconds)
│   ├── headgroup-config-cache-ttl       # Cache TTL (seconds)
│   └── sfcc-storefront-url              # SFCC URL for search proxy
│
└── router/waf/<project>/arn             # WAF ARN (gateway)
```

---

## Secrets Manager Convention

| Secret Path | Service | Contents |
|-------------|---------|----------|
| `/hema/global/auth` | All | `{ clientId, clientSecret }` — Kong OAuth |
| `/hema/global/basic-auth` | Gateway/E2E | `{ username, password }` — Preview basic auth |
| `/hema/omni-web-content-frontend/sanity` | Content MFE | `{ apiReadToken }` |
| `/hema/pdp/sanity` | PDP MFE | `{ projectId, dataset, apiReadToken }` |
| `<stage>/cms-env-vars` | CMS | All CMS env vars bundled |

---

## CDK Stack Naming Convention

| Pattern | Example | Purpose |
|---------|---------|---------|
| `<project>-ci` | `content-main-ci` | Pipeline stack |
| `<project>-rt` | `content-main-rt` | Runtime stack (ECS, ALB, gateway reg) |
| `<project>-monitoring` | `omni-web-gateway-prod-monitoring` | Monitoring stack |
| `<project>-waf` | `omni-web-gateway-prod-waf` | WAF stack (us-east-1) |

For Butler sandboxes: `<service>-<branch>-ci`, `<service>-<branch>-rt`

---

## CDK Tags (Applied to All Stacks)

| Tag | Value | Purpose |
|-----|-------|---------|
| `stage` | `configurationName` (prod/int/test) | Environment identification |
| `service` | Service ID | Cost allocation |
| `component` | Component name | Service catalog mapping |
| `butlerStackTag` | Butler tag or "none" | Stack lifecycle management |
| `team` | Team name (e.g., "CoFi") | Ownership (CMS only) |

---

## Key Differences Between Environments

| Aspect | Sandbox (temporary) | Test (permanent) | Production |
|--------|--------------------:|:----------------:|:----------:|
| Manual approval | No | No | Yes |
| AlertPublisher | No | Yes | Yes |
| WAF | No | No (gateway only) | Yes |
| Monitoring stack | No | Yes | Yes |
| terminationProtection | No | No | Yes |
| Spot instances | Yes (`enableSpot`) | No | No |
| Auto-cleanup | Yes (branch delete) | No | No |
| Playwright E2E | No | Yes (post-deploy) | No |
| CDK garbage collection | No | Yes | Yes |
