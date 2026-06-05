---
title: "Environments"
sidebar:
  order: 1
---

> For AWS access and account requests, see the [Platform Catalog](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/architecture-principles/reference/platform-catalog/) and [AWS Access Guide](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/aws/aws-access/).

## Two AWS Accounts

All frontend services run in two accounts:

| Account | Purpose | Region |
|---------|---------|--------|
| **Production** (`214061306515`) | Live traffic (prod) | eu-central-1 |
| **Non-production** (`213617179136`) | Sandboxes, test, preprod | eu-central-1 |

WAF stacks are the exception — deployed to `us-east-1` (required for CloudFront).

---

## Developer Journey

```d2
direction: down

local: "Local Development" {
  style.fill: "#F3E5F5"
}

sandbox: "Butler Sandbox" {
  style.fill: "#FFF9C4"
}

test: "Test Environment" {
  style.fill: "#E3F2FD"
}

prod: "Production" {
  style.fill: "#E8F5E9"
}

local -> sandbox: "git push feature/*"
sandbox -> test: "PR merged to main"
test -> prod: "automatic or manual approval"
```

| Stage | Account | Lifecycle | URL Pattern |
|-------|---------|-----------|-------------|
| **Sandbox** | Non-prod | Temporary (auto-created, auto-deleted) | `frontend-<branch>.<service>.ui-test.hema.digital` |
| **Test** | Non-prod | Permanent (auto-deployed on main) | Preview URLs via gateway registration |
| **Production** | Prod | Permanent (manual approval for gateway) | `www.hema.nl` / `www.hema.com` |

---

## What Differs Per Environment

| Aspect | Sandbox | Test | Production |
|--------|---------|------|------------|
| Manual approval | ✗ | ✗ | ✓ |
| Monitoring & alarms | ✗ | ✓ | ✓ |
| WAF | ✗ | ✗ | ✓ |
| Spot instances | ✓ (cost saving) | ✗ | ✗ |
| E2E tests (Playwright) | ✗ | ✓ | ✗ |
| Auto-cleanup on branch delete | ✓ | ✗ | ✗ |
| `terminationProtection` | ✗ | ✗ | ✓ |

---

## Per-Service Environments

### MFEs (Content, PDP)

| Environment | Branch | Trigger |
|-------------|--------|---------|
| Production | `main` | Push + manual approval |
| Test | `main` | Push (automatic) |
| Sandbox | `feature/*`, `fix/*`, `chore/*` | Butler push |

### CMS

```d2
direction: down

sandbox: "Sandbox" {
  style.fill: "#FFF9C4"
}

preprod: "Pre-production" {
  style.fill: "#E3F2FD"
}

prod: "Production" {
  style.fill: "#E8F5E9"
}

sandbox -> preprod: "PR merged to main"
preprod -> prod: "automatic"
```

| Environment | Branch | Trigger | Dataset | Studio URL |
|-------------|--------|---------|---------|------------|
| Production | `main` | Push | `production` | `hema-cms.sanity.studio` |
| Pre-production | `main` | Push | `preprod` | `preprod-hema-cms.sanity.studio` |
| Staging | `main` | Git tag | `staging` | `staging-hema-cms.sanity.studio` |
| Sandbox | `feature/*` | Push | `<branch>_sandbox` | `<branch>-sandbox-hema-cms.sanity.studio` |

CMS sandboxes create a new Sanity dataset automatically and are cleaned up on branch deletion.

### Gateway

| Environment | Branch | Trigger | Domains |
|-------------|--------|---------|---------|
| Production | `main` | Push + manual approval | `www.hema.nl`, `www.hema.com` |
| Integration | `integration` | Push | Internal preview domains |
| Beta | `beta/*` | Push | Preview domains |
| Test | `main` | Push | `*.omni-web-gateway.experience-dev.hema.digital` |
| Sandbox | `feature/*` | Butler push | Temporary preview domains |

---

## Environment Model (CDK)

Every service uses the `Environment` interface from `@hema/common-types`:

```typescript
interface Environment {
  name: string;               // "prod", "test1", "feature-cofi-123"
  service: string;            // "omni-web-content"
  component: string;          // "frontend"
  temporary: boolean;         // true for sandboxes
  configurationName: string;  // "prod" | "int" | "test"
}
```

`configurationName` determines which SSM parameters are loaded — multiple environment names can share the same config (e.g., all sandboxes use `test` config).

---

## Configuration

### SSM Parameters (key paths)

| Path | Purpose |
|------|---------|
| `/hema/global/auth` | Kong OAuth credentials (Secret) |
| `/hema/global/business-base-url` | Internal API base URL |
| `/hema/global/gateway/account-id` | Gateway account for RAM sharing |
| `/hema/<service>/<configName>/base-url` | Public domain per environment |
| `/hema/<service>/sanity/project-id` | Sanity project ID |
| `/hema/<service>/<configName>/sanity/dataset` | Sanity dataset per environment |

### Secrets Manager

| Path | Service | Contents |
|------|---------|----------|
| `/hema/global/auth` | All MFEs | Kong OAuth `{ clientId, clientSecret }` |
| `/hema/global/basic-auth` | Gateway/E2E | Preview basic auth |
| `/hema/<service>/sanity` | MFEs | Sanity `{ apiReadToken }` |
| `<stage>/cms-env-vars` | CMS | All CMS env vars bundled |

---

## Stack Naming

| Pattern | Example |
|---------|---------|
| `<project>-ci` | `content-main-ci` |
| `<project>-rt` | `content-main-rt` |
| `<project>-monitoring` | `omni-web-gateway-prod-monitoring` |
| `<project>-waf` | `omni-web-gateway-prod-waf` |

Butler sandboxes: `<service>-<branch>-ci`, `<service>-<branch>-rt`
