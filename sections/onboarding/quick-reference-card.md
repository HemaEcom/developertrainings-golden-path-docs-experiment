# Quick Reference Card — HEMA100 Frontend

> Single-page cheat sheet for common commands and patterns.

## Setup

```bash
# Clone and install
git clone git@github.com:HemaEcom/<repo-name>.git
cd <repo-name>
npm install
cd src && npm install

# CodeArtifact login (required for @hema packages)
npm run co:login

# Fetch environment variables
./scripts/fetch-env-from-aws.sh        # or
npm run environment:set:sandbox        # CMS repo
```

## Local Development

```bash
# Start Next.js dev server
npm run dev                            # from src/

# Run tests
npm run test                           # Vitest (unit)
npm run test:watch                     # Vitest watch mode
npm run playwright                     # Playwright E2E

# Lint & format
npm run lint
npm run lint:fix
npm run format:fix
```

## CDK / Infrastructure

```bash
# Synthesize CloudFormation templates
npm run cdk synth

# Deploy to sandbox (feature branch)
npx cdk deploy --require-approval=never

# Deploy CMS to sandbox
npm run deploy:sandbox
```

## Butler (Feature Sandboxes)

```bash
# Branch naming (required for Butler)
git checkout -b feature/cofi-123
git checkout -b fix/cofi-456
git checkout -b chore/cofi-789

# Push triggers Butler pipeline automatically
git push -u origin feature/cofi-123

# Sandbox URL pattern:
# https://frontend-<branch>.omni-web-<service>.ui-test.hema.digital/
```

## Gateway Routes

```json
// lib/runtime/gateway-routes-config.json
{
  "domains": [
    { "gatewayDomain": "nl", "locales": ["nl-nl"] },
    { "gatewayDomain": "com", "localePrefix": "always", "locales": ["nl-be", "fr-be", "fr-fr", "de-de"] }
  ],
  "routes": [
    { "name": "zones-prefix", "type": "prefix", "enabled": true, "route": "_zones/<service-id>" }
  ],
  "rolloutPercentage": 100
}
```

## Sanity CMS

```bash
# Studio
cd omni-cms-composable-cms
npm run dev                            # Local studio at localhost:3333

# Schema validation
npm run validate-schema

# Deploy studio
npm run deploy:sandbox                 # Sandbox
npm run deploy:preprod                 # Pre-production

# Migrations
npx sanity migration run migrations/<name>.ts --dataset <dataset>
```

## Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Dataset (production, preprod, sandbox) |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | Studio URL for visual editing |
| `SANITY_API_READ_TOKEN` | Server-only read token (draft mode) |
| `NEXT_PUBLIC_BASE_URL` | Public domain (hema.nl / hema.com) |
| `BASE_API_URL` | Internal API base URL |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) |

## Project Structure

```
<repo>/
├── lib/                          # CDK infrastructure
│   ├── common/                   # Shared constructs (ECS, ALB, alarms)
│   ├── components/               # EcsNextJsBundle
│   ├── runtime/                  # Runtime stack + gateway config
│   └── pipeline/                 # CI/CD pipeline stack
├── src/                          # Next.js application
│   ├── app/                      # App Router pages
│   │   ├── [locale]/             # Locale-prefixed routes
│   │   └── api/                  # API routes (health, draft-mode)
│   ├── components/               # React components
│   ├── repositories/             # Data access (Sanity, PODS)
│   ├── services/                 # Business logic
│   ├── i18n/                     # Internationalization config
│   ├── utils/                    # Utilities (logger, constants)
│   ├── Dockerfile                # Production container
│   ├── next.config.ts            # Next.js + zone config
│   └── middleware.ts             # i18n middleware
├── buildspec-ci.yaml             # Butler sandbox spec
├── cdk.json                      # CDK configuration
└── package.json                  # Root (CDK deps, scripts)
```

## Key Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.x | Framework |
| `@hema/omni-web-app-shell-shell` | 3.x | Layout (header, footer) |
| `@hema/omni-web-app-shell-analytics` | 3.x | GTM analytics |
| `@hema/omni-web-app-shell-core` | 3.x | Core utilities |
| `@hema/hds-components-react` | 2.1.0-rc | UI components |
| `@hema/hds-tailwindcss-presets` | 2.1.0-rc | Tailwind presets |
| `@hema/hds-assets` | 2.1.0-rc | Icons, fonts |
| `next-intl` | 4.x | i18n routing |
| `next-sanity` | 12.x | Sanity client |
| `@hema/monitoring-logger` | 3.x | Structured logging |
| `@hema/monitoring-constructs` | 3.x | CDK alarms |
| `@hema/omni-web-gateway-management-library-constructs` | 2.x | Gateway registration |

## Supported Locales

| Domain | Locale | Language | Country |
|--------|--------|----------|---------|
| hema.nl | nl-nl | Dutch | Netherlands |
| hema.com | nl-be | Dutch | Belgium |
| hema.com | fr-be | French | Belgium |
| hema.com | fr-fr | French | France |
| hema.com | de-de | German | Germany |

## Common Issues

| Problem | Solution |
|---------|----------|
| `@hema` packages not found | Run `npm run co:login` |
| CDK deploy fails with VPC error | Check AWS SSO session: `aws sso login` |
| Sanity queries return null | Verify `NEXT_PUBLIC_SANITY_DATASET` matches your environment |
| Butler build fails | Check branch name format: `feature/word-word` |
| Gateway registration fails | Ensure security credentials secret has `clientId` and `clientSecret` |
| Draft mode not working | Check `SANITY_API_READ_TOKEN` is set and valid |
| HDS styles not loading | Verify `@hema/hds-tailwindcss-presets` in CSS: `@import` |

## Useful Links

| Resource | URL |
|----------|-----|
| Sanity Studio (prod) | `https://hema-cms.sanity.studio` |
| Service Catalog | `https://servicecatalog.ui.hema.digital` |
| Gateway Preview (NL) | Output from `cdk deploy` → `PreviewUrlNl` |
| Gateway Preview (COM) | Output from `cdk deploy` → `PreviewUrlCom` |
| HDS Storybook | Check `hema-design-system` repo README |
