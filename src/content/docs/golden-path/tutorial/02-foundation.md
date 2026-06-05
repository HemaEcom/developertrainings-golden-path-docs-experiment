---
title: "1. Foundation Setup"
description: Create your service from the template and set up AWS access
sidebar:
  order: 2
---

Let's get your service created! This part sets up the repo structure and AWS access you'll need for everything else.

## Repository Structure

Every MFE repo follows a **single-repo** layout with two concerns separated by folder:

```
your-service-name/
├── bin/solution.ts         # CDK app entry point
├── lib/                    # CDK infrastructure code
│   ├── common/             # Shared constructs (ECS, ALB, CloudFront, alarms)
│   ├── components/         # L3 bundles (e.g., EcsNextJsBundle)
│   ├── pipeline/           # CI/CD pipeline stack
│   └── runtime/            # Runtime stack (ECS, gateway registration, monitoring)
├── src/                    # Next.js application
│   ├── app/                # Next.js App Router (pages, layouts, routes)
│   ├── components/         # React components
│   ├── repositories/       # Data access layer
│   ├── services/           # Business logic
│   ├── Dockerfile          # Docker build for ECS deployment
│   ├── next.config.ts      # Next.js + multi-zone configuration
│   └── package.json        # App dependencies (React, Next.js, HDS, Shell)
├── cdk.json                # CDK configuration
├── package.json            # Root dependencies (CDK, constructs, gateway lib)
├── buildspec-ci.yaml       # CodeBuild spec for Butler sandboxes
├── catalog-info.yaml       # Service Catalog metadata (Backstage)
└── README.md
```

**Why this layout?**

The root level (`bin/`, `lib/`, `cdk.json`, root `package.json`) is your **infrastructure** — it defines how the service is built, deployed, and operated on AWS. The `src/` folder is your **application** — the Next.js code that runs inside the Docker container.

They each have their own `package.json` because their dependency trees are completely different (CDK + AWS SDK vs React + Next.js), but they're not separate projects. The root delegates to `src/` for day-to-day development:

```json
{
  "scripts": {
    "dev": "cd src && npm run dev",
    "test": "cd src && npm run test",
    "install-all": "npm i && cd src && npm i"
  }
}
```

And the CDK code in `lib/` references `src/` as the Docker build context:

```typescript
// lib/components/ecs-nextjs.bundle.ts
dockerImagePath: join(import.meta.dirname, '../../src'),
```

:::tip[Day-to-day you mostly work in `src/`]
As a frontend developer, you'll spend 95% of your time in `src/` writing React components, pages, and API routes. The `lib/` infrastructure code is set up once and rarely changes unless you're adding new AWS resources or modifying the deployment pipeline.
:::

## Step 1: Create Service from Template

1. Go to https://servicecatalog.ui.hema.digital
2. Click **Create** → **"Create an example TypeScript service"**
3. Fill in your service details (service name, team, component)
4. Your new repo is created with the structure shown above

## Step 2: Request AWS Accounts

Each service gets its own AWS accounts (one pre-prod, one prod). Request via the [Platform Catalog](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/architecture-principles/reference/platform-catalog/#add-aws-account).

Processing time: 5–7 business days via Topdesk.

## Step 3: AWS GitHub Connection (CodeStar)

CodePipeline needs a connection to pull source code from GitHub. [Request it here](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/architecture-principles/reference/platform-catalog/#aws-github-connection).

Processing time: 3–5 business days via Topdesk.

## Step 4: Clone and Install

```bash
git clone git@github.com:hema-digital/your-service-name.git
cd your-service-name
npm install
```

This installs the CDK dependencies (root level). The Next.js app dependencies come later in [Part 3](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/04-nextjs-setup).

:::note
You need CodeArtifact access for `@hema/*` packages. Run `npm run co:login` to authenticate, or see the [CodeArtifact docs](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/devtools/libraries/code-artifact-repository/).
:::
