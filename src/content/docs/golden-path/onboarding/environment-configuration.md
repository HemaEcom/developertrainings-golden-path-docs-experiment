---
title: "Environment Configuration"
---


> Source: [omni-web-content-frontend](https://github.com/HemaEcom/omni-web-content-frontend) environment patterns
> Services: AWS Secrets Manager, SSM Parameter Store

---

## Overview

MFE services use a layered environment configuration approach:

| Layer | Tool | Purpose |
|-------|------|---------|
| **Secrets** | AWS Secrets Manager | Sensitive values (API tokens, CMS tokens) |
| **Parameters** | SSM Parameter Store | Non-sensitive config (URLs, feature flags) |
| **Build-time** | `NEXT_PUBLIC_*` env vars | Client-side configuration |
| **Local dev** | `.env.local` file | Developer machine config |

---

## Local Development Setup

### Fetching Environment Variables

Use the provided script to pull secrets from AWS Secrets Manager into a local `.env.local` file:

```bash
# From src/ directory
bash scripts/environment-variables.sh -s next-env-vars/local
```

This script:
1. Authenticates with AWS Secrets Manager
2. Fetches the secret named `next-env-vars/local`
3. Parses the JSON and writes key=value pairs to `.env.local`

### Script Options

```bash
bash scripts/environment-variables.sh [-p profile] [-s secret-name] [-r region] [-o output-file]
```

| Flag | Default | Purpose |
|------|---------|---------|
| `-p` | (account-specific) | AWS CLI profile |
| `-s` | `next-env-vars/local` | Secret name in Secrets Manager |
| `-r` | `eu-central-1` | AWS region |
| `-o` | `.env.local` | Output file path |

### Prerequisites

- AWS CLI installed and configured with SSO
- Node.js installed (for JSON parsing)
- Access to the service's AWS account

### Package.json Script

```json
{
  "scripts": {
    "environment:set:local": "bash scripts/environment-variables.sh -s next-env-vars/local"
  }
}
```

---

## Environment Variable Categories

### Public (Client-Side) — `NEXT_PUBLIC_*`

Available in both server and client components. Bundled into the JavaScript at build time.

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_BASE_URL` | CloudFront distribution URL | `https://www.hema.nl` |
| `NEXT_PUBLIC_DOMAIN_NL` | Dutch domain | `hema.nl` |
| `NEXT_PUBLIC_DOMAIN_COM` | International domain | `hema.com` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID | `abc123` |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset | `production` |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | Sanity Studio URL | `https://studio.sanity.io/...` |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager ID | `GTM-XXXXX` |

### Server-Only

Only available in server components, API routes, and middleware. Never exposed to the client.

| Variable | Purpose |
|----------|---------|
| `SANITY_API_READ_TOKEN` | Sanity API authentication |
| `BASE_COMMERCE_API_URL` | Backend commerce API base URL |
| `KONG_API_TOKEN` | API gateway authentication |
| `LOG_LEVEL` | Logging verbosity (debug, info, warn, error) |

---

## Secrets Manager Structure

Secrets are stored per environment in AWS Secrets Manager:

```
next-env-vars/local        → Local development
next-env-vars/dev          → Development environment
next-env-vars/preprod      → Pre-production
next-env-vars/prod         → Production
```

Each secret is a JSON object:
```json
{
  "NEXT_PUBLIC_BASE_URL": "https://www.hema.nl",
  "NEXT_PUBLIC_SANITY_PROJECT_ID": "abc123",
  "SANITY_API_READ_TOKEN": "sk-...",
  "BASE_COMMERCE_API_URL": "https://api.hema.nl"
}
```

---

## CDK Integration

The runtime stack reads parameters and passes them to the ECS task definition as environment variables:

```ts
// In lib/runtime/runtime-stack.ts
const taskDefinition = new ecs.TaskDefinition(this, 'TaskDef', {
  // ...
});

taskDefinition.addContainer('app', {
  environment: {
    NEXT_PUBLIC_BASE_URL: ssm.StringParameter.valueForStringParameter(this, '/hema/service/base-url'),
    NODE_ENV: 'production',
  },
  secrets: {
    SANITY_API_READ_TOKEN: ecs.Secret.fromSecretsManager(sanitySecret, 'SANITY_API_READ_TOKEN'),
  },
});
```

---

## Docker Build-Time vs Runtime

Because Next.js bakes `NEXT_PUBLIC_*` variables at build time, the Dockerfile uses BuildKit secrets:

```dockerfile
# Build-time: NEXT_PUBLIC_* vars are needed during `next build`
RUN --mount=type=secret,id=env,target=/app/.env.production \
    npm run build
```

Runtime variables (server-only) are injected via ECS task definition environment.

See [Docker/Standalone Build Guide](../infrastructure/docker-standalone.md) for the full Dockerfile pattern.

---

## Environment-Specific .env Files

For E2E testing against different environments:

```
.env.local      → Local development
.env.dev        → Dev environment E2E
.env.staging    → Staging environment E2E
.env.prod       → Production E2E (read-only tests)
```

E2E scripts reference these:
```json
{
  "e2e:bdd": "SECRETS=.env.local playwright test",
  "e2e:bdd:staging": "SECRETS=.env.staging E2E_REMOTE=true playwright test"
}
```

---

## Adding a New Environment Variable

1. **Add to Secrets Manager** — Update the JSON secret in the appropriate environment(s)
2. **Add to `.env.example`** — Document the variable (without real values)
3. **Add to CDK** — If server-only, add to ECS task definition environment/secrets
4. **Add to Dockerfile** — If `NEXT_PUBLIC_*`, ensure it's available at build time
5. **Add to Vitest config** — Add a test value in `vitest.config.mts` `test.env`
6. **Update documentation** — Add to this guide

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `NEXT_PUBLIC_*` undefined at runtime | These are baked at build time; rebuild the Docker image |
| Script fails with "Failed to retrieve secret" | Check AWS SSO session is active (`aws sso login`) |
| Missing env var in deployed service | Check ECS task definition in CloudFormation; verify SSM/Secrets Manager path |
| Different values per locale | Use the domain env vars (`NEXT_PUBLIC_DOMAIN_NL`, `NEXT_PUBLIC_DOMAIN_COM`) |

---

## Reference Implementation

See `omni-web-content-frontend/src/`:
- `scripts/environment-variables.sh` — Local env setup script
- `vitest.config.mts` `test.env` — Test environment variables
- `utils/constants.ts` — Public URL and feature flag constants
