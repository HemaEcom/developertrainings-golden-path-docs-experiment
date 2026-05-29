# Golden Path Tutorial - Create a Frontend Service

> Source: [Confluence COCO Space - Page ID 6316654631](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6316654631)
> Version: 27 | Last synced: 2026-05-28

---

## Overview

This guide walks you through creating a production-ready Next.js frontend service at HEMA using the [TypeScript Skeleton Template](https://servicecatalog.ui.hema.digital/catalog/default/template/scaffolder-typescript-skeleton) as a foundation. You'll manually add Next.js application code and AWS infrastructure (CDK) to create a fully deployable service that follows HEMA standards.

## What This Guide Covers

This is a **manual setup tutorial** designed to help you:

- Create a base TypeScript service from the HEMA Service Catalog
- Scaffold a Next.js application with HEMA standards
- Set up AWS infrastructure using CDK
- Configure CI/CD pipeline with DevOps Butler
- Integrate shared HEMA capabilities (Web Shell, HDS, Analytics)
- Deploy and monitor your service

**Why Manual Setup?**

For now, we are keeping parts of the setup manual in order to:

- Gather customer feedback on the process
- Iterate on an aligned solution based on real usage
- Provide flexibility for different service requirements
- Build understanding of the full stack before automation

Future iterations will automate more of this process through Backstage template actions.

## Prerequisites

Before starting, ensure you have:

- **SSO Access:** Active HEMA SSO account with appropriate permissions
- **AWS CLI:** Configured with HEMA credentials (via SSO)
- **Node.js**: Version 22 or later installed
- **Git:** Configured with your HEMA GitHub access
- **Service Catalog Access**: Access to https://servicecatalog.ui.hema.digital
- **Service Name Approval**: Your service name approved by the platform team
  - Request page

---

## Part 1: Foundation Setup

### Step 1: Create Service from TypeScript Skeleton Template

1. Navigate to the HEMA Service Catalog: https://servicecatalog.ui.hema.digital
2. Click **Create** and select **"Create an example TypeScript service"**
3. Fill in the template form with your service details
4. Check your new repository created

**What You Get:**

- Basic TypeScript project structure
- **catalog-info.yaml** pre-configured for Service Catalog
- Standard **HEMA** project files (`.editorconfig`, `.prettierrc`, etc.)
- Basic CDK setup in `lib/` directory with a ci/cd pipeline + infra stack
- Documentation templates in `docs/`

**Repository Structure:**

```
your-service-name/
├── bin/                    # CDK app entry points
├── lib/                    # CDK infrastructure code
│   ├── common/             # Shared constructs
│   ├── pipeline/           # CI/CD pipeline stack
│   └── runtime/            # Runtime environment stack
├── docs/                   # Service documentation
├── src/                    # Next.js application (to be created)
├── cdk.json                # CDK configuration
├── package.json            # Root package.json for CDK
├── tsconfig.json           # TypeScript config for CDK
├── catalog-info.yaml       # Service Catalog metadata
├── buildspec-ci.yaml       # CodeBuild configuration
└── README.md               # Service overview
```

This repository structure keeps your infrastructure code and application code together, making it easier to:

- Manage deployments from a single repository
- Version infrastructure and application code together
- Share configuration and scripts
- Maintain consistency across environments

### Step 2: Request AWS Accounts

Request the AWS accounts via this [form](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/architecture-principles/reference/platform-catalog/#add-aws-account)

### Step 3: AWS GitHub connection via CodeStar for CI/CD

- [Request GitHub connection on AWS](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/architecture-principles/reference/platform-catalog/#aws-github-connection)

### Step 4: Clone Repository Locally

```bash
git clone git@github.com:hema-digital/your-service-name.git
cd your-service-name
# Install dependencies
npm install
```

---

## Part 2: Deploy the CI/CD Pipeline Stack

Deploy the pipeline stack to AWS. This is a **one-time deployment** that creates the CodePipeline infrastructure.

```bash
project="{service}-{component}" \
repo="{repository-name}" \
branch="main" \
environmentName="preprod" \
npx cdk deploy
```

**What This Does:**

The deployment creates:

1. **CI Stack** (`{project}-ci`) - The CodePipeline infrastructure
   - Source stage (GitHub connection)
   - Build stage (npm install, test, lint, audit)
   - Synth stage (CDK synthesis)
   - Deploy stage (runtime stack deployment)

2. **Runtime Stack** (`{project}-rt`) - Deployed automatically by the pipeline
   - Application infrastructure
   - Networking resources

### Verify Deployment

#### Check CloudFormation Stacks

Navigate to [CloudFormation Console](https://eu-central-1.console.aws.amazon.com/cloudformation/home?region=eu-central-1#/stacks) and verify:

- `{project}-ci` - CI/CD pipeline stack (CREATE_COMPLETE)
- `{project}-rt` - Runtime stack (CREATE_COMPLETE)

#### Check CodePipeline

Navigate to [CodePipeline Console](https://eu-central-1.console.aws.amazon.com/codesuite/codepipeline/pipelines) and verify:

- Pipeline `{project}` exists
- First execution completed successfully
- All stages (Source, Build, UpdatePipeline, Deploy) are green

### Understanding the Deployment Model

#### CI/CD Stack vs Runtime Stack

- **CI/CD Stack (`-ci`):** Defines how code is built and deployed
  - Deployed manually by developer
  - Rarely updated (only when pipeline definition changes)
  - Pipelines do not deploy pipelines (important rule)

- **Runtime Stack (`-rt`):** Defines how the application runs
  - Deployed automatically by the CI/CD pipeline
  - Updated frequently (on every commit to main)

### Install and test Butler (feature sandbox)

- Install Butler in the AWS account
  - [What is Butler](https://servicecatalog.ui.hema.digital/docs/default/resource/infrastructure-devops-dev-docs/devtools/releasemanagement/#the-butler-hemas-standard-solution)
  - [How to install](https://github.com/HemaEcom/devops-butler/blob/develop/docs/consumers/how-to-deploy.md)

---

## Part 3: Next.js Application Setup

### Scaffold Next.js Application

Create a Next.js application inside your project in the `src/` directory:

```bash
# From project root
npx create-next-app@latest src --typescript --tailwind --app --no-src-dir
```

**Answer the prompts:**

- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No
- App Router: Yes
- Import alias: Yes (@/*)

**Updated Repository Structure:**

```
your-service-name/
├── bin/                    # CDK app entry points
├── lib/                    # CDK infrastructure code
├── docs/                   # Service documentation
├── src/                    # Next.js application
│   ├── app/                # Next.js App Router
│   ├── components/         # React components
│   ├── services/           # API services
│   ├── repositories/       # Data repositories
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   ├── locale-messages/    # i18n translations
│   ├── public/             # Static assets
│   ├── Dockerfile          # Docker build for ECS deployment
│   ├── package.json        # App dependencies
│   ├── next.config.ts      # Next.js configuration
│   ├── tailwind.config.ts  # Tailwind configuration
│   └── tsconfig.json       # App TypeScript config
├── cdk.json                # CDK configuration
├── package.json            # Root package.json for CDK
└── README.md               # Service overview
```

---

## Part 4: Integrate & Deploy Next.js Infrastructure Stack

This part covers the CDK infrastructure, Docker build, gateway registration, and multi-zone configuration needed to deploy your Next.js app to production.

**Detailed guides:**

| Topic | Guide |
|-------|-------|
| CDK Infrastructure (ECS + ALB + Pipeline) | [sections/infrastructure/cdk-infrastructure.md](sections/infrastructure/cdk-infrastructure.md) |
| Docker Standalone Build | [sections/infrastructure/docker-standalone.md](sections/infrastructure/docker-standalone.md) |
| Gateway Registration | [sections/gateway/gateway-registration.md](sections/gateway/gateway-registration.md) |
| Multi-Zone next.config.ts | [sections/gateway/multi-zone-config.md](sections/gateway/multi-zone-config.md) |
| Environment Configuration | [sections/onboarding/environment-configuration.md](sections/onboarding/environment-configuration.md) |

**Summary of what you need:**

1. **Configure `next.config.ts`** — Set `output: 'standalone'`, configure `assetPrefix` and zone config
2. **Create `Dockerfile`** — Multi-stage build using standalone output
3. **Set up CDK runtime stack** — ECS Fargate + ALB + CloudFront VPC origin
4. **Configure gateway registration** — Define routes in `gateway-routes-config.json`
5. **Set up environment variables** — Configure Secrets Manager and SSM parameters

As a practical reference, the current CDK implementation in the **omni-web-content** repository follows this architecture:
- https://github.com/HemaEcom/omni-web-content-frontend

---

## Part 5: Integrate HEMA Platform Capabilities

This part covers the shared libraries and platform capabilities that every MFE integrates.

**Detailed guides:**

| Topic | Guide |
|-------|-------|
| Web Shell Integration (Layout, Analytics, APIs) | [sections/libraries/web-shell-integration.md](sections/libraries/web-shell-integration.md) |
| HDS / Tompouce Design System | [sections/libraries/hds-integration.md](sections/libraries/hds-integration.md) |
| Internationalization (i18n) | [sections/onboarding/i18n-setup.md](sections/onboarding/i18n-setup.md) |
| Testing Strategy (Vitest + Playwright BDD) | [sections/ci-cd/testing-strategy.md](sections/ci-cd/testing-strategy.md) |
| Butler & Feature Sandboxes | [sections/ci-cd/butler-feature-sandboxes.md](sections/ci-cd/butler-feature-sandboxes.md) |

**Integration order:**

1. **HDS** — Install design system packages, configure Tailwind CSS v4
2. **Web Shell** — Wrap your app with Shell for header, footer, analytics
3. **i18n** — Set up next-intl with multi-domain routing
4. **Testing** — Configure Vitest for unit tests, Playwright BDD for E2E
5. **Butler** — Write `buildspec-ci.yaml` for feature sandbox deployments

### Quick Start: Tompouce HDS

```bash
cd src/
npm install @hema/hds-components-react @hema/hds-assets @hema/hds-tailwindcss-presets
npm install -D tailwindcss@4 @tailwindcss/postcss postcss
```

See the [full HDS integration guide](sections/libraries/hds-integration.md) for PostCSS config, globals.css setup, and component usage.

---

## What's Next

These guides complete the platform knowledge needed to operate your MFE in production:

| Topic | Guide |
|-------|-------|
| Monitoring & Observability | [sections/monitoring/observability.md](sections/monitoring/observability.md) |
| Sanity CMS Integration | [sections/cms/overview.md](sections/cms/overview.md) |
| Performance & Caching | [sections/performance/caching-cdn.md](sections/performance/caching-cdn.md) |
| Security (WAF, Headers) | [sections/security/security-headers-waf.md](sections/security/security-headers-waf.md) |
| Data APIs (PODS, Kong Auth) | [sections/data-apis/overview.md](sections/data-apis/overview.md) |
| Session Sharing (SFCC ↔ Next.js) | [sections/data-apis/session-sharing.md](sections/data-apis/session-sharing.md) |
| Server Actions vs API Routes | [sections/onboarding/server-actions-vs-api-routes.md](sections/onboarding/server-actions-vs-api-routes.md) |
| Environments Map | [sections/environments/environment-map.md](sections/environments/environment-map.md) |
| Federated Sitemaps | [sections/gateway/federated-sitemaps.md](sections/gateway/federated-sitemaps.md) |
| Quick Reference Card | [sections/onboarding/quick-reference-card.md](sections/onboarding/quick-reference-card.md) |
