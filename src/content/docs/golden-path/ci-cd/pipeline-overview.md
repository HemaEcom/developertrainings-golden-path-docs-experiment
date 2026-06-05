---
title: "CI/CD Pipeline Overview"
description: How the self-mutating pipeline works — from code push to production, with a real example from the PDP service.
sidebar:
  order: 1
---

> Source: [omni-web-catalog-pdp/lib/pipeline/pipeline-stack.ts](https://github.com/HemaEcom/omni-web-catalog-pdp/blob/main/lib/pipeline/pipeline-stack.ts)
> Runtime: Node.js 24 | CDK 2.251 | CodePipeline V2 | ARM64 builds

---

## The Ideal Minimal Pipeline

Every MFE in hema100 follows the same pipeline pattern. The key insight: **you deploy the pipeline once, and it takes care of everything after that** — including updating itself.

The pipeline is a **self-mutating CodePipeline** that:
1. Watches your GitHub repo for pushes to `main`
2. Synthesizes CDK (generates CloudFormation templates)
3. Updates itself if the pipeline definition changed
4. Deploys your runtime infrastructure (ECS Fargate + ALB + Gateway registration)
5. Runs E2E tests against the deployed environment
6. Cleans up stale CDK assets

This means after the initial `cdk deploy`, you never manually deploy again. Every push to `main` triggers the full pipeline automatically.

---

## Pipeline Architecture (PDP Example)

```d2
direction: down

github: GitHub {
  shape: document
  push: "Push to main"
}

pipeline: CodePipeline V2 {
  style.fill: "#E3F2FD"

  source: Source {
    shape: step
    style.fill: "#BBDEFB"
  }

  synth: Synth {
    shape: step
    style.fill: "#C8E6C9"
    label: "Synth\n(install, audit, lint, test, build, cdk synth)"
  }

  selfmutate: Self-Mutate {
    shape: step
    style.fill: "#FFF9C4"
    label: "Update Pipeline\n(if pipeline definition changed)"
  }

  deploy: Deploy Runtime {
    shape: step
    style.fill: "#FFCCBC"
    label: "Deploy\n(ECS Fargate + ALB + Gateway)"
  }

  post: Post-Deploy {
    shape: step
    style.fill: "#E1BEE7"
    label: "Playwright E2E + GC"
  }

  source -> synth
  synth -> selfmutate
  selfmutate -> deploy
  deploy -> post
}

aws: AWS Runtime {
  style.fill: "#FFF3E0"
  ecs: ECS Fargate {
    shape: hexagon
  }
  alb: ALB {
    shape: diamond
  }
  gateway: Gateway Registration {
    shape: cloud
  }
  ecs -> alb
  alb -> gateway
}

github -> pipeline.source: "CodeStar connection"
pipeline.deploy -> aws: "CloudFormation"
pipeline.post -> aws.gateway: "E2E tests against preview URL"
```

---

## What Each Stage Does

### 1. Source
Pulls code from GitHub via a CodeStar connection. Triggered on every push to the configured branch.

### 2. Synth (the heavy lifter)
This is where most of the work happens. In a single CodeBuild step:

```bash
npm run co:login                    # Authenticate with CodeArtifact
npm ci                              # Install CDK dependencies
(cd src && npm ci)                  # Install app dependencies
(cd src && npm run sync:translations) # Sync i18n translations
npm run audit                       # Security audit (high severity)
npm run lint                        # ESLint
npm run test                        # Vitest unit tests
npm run build                       # TypeScript compilation (CDK)
npm run cdk synth                   # Generate CloudFormation templates
```

If any step fails, the pipeline stops. No broken code reaches deployment.

### 3. Self-Mutate
CDK Pipelines magic: if you changed the pipeline definition itself (e.g., added a new stage), the pipeline updates itself before proceeding. You never need to manually redeploy the pipeline.

### 4. Deploy Runtime
Deploys the runtime stack via CloudFormation:
- **ECS Fargate** service running your Next.js Docker container
- **Application Load Balancer** with health checks
- **Gateway Registration** — registers your routes with the CloudFront gateway
- **Monitoring alarms** (CPU, memory, 5xx errors)
- **VPC Origin** for secure CloudFront → ALB communication

For production environments, a **Manual Approval** step is added before deploy.

### 5. Post-Deploy
Two parallel steps run after deployment:
- **Playwright E2E** — runs end-to-end tests against the deployed preview URLs
- **Garbage Collect** — cleans up stale CDK assets (old Docker images, S3 objects) older than 7 days

---

## Two Stacks, One Repo

Every MFE produces exactly two CloudFormation stacks:

| Stack | Name Pattern | What It Contains | Who Deploys It |
|-------|-------------|------------------|----------------|
| **CI** | `{project}-ci` | CodePipeline, CodeBuild projects, IAM roles | You (once, manually) |
| **Runtime** | `{project}-rt` | ECS Fargate, ALB, Gateway registration, alarms | The pipeline (on every push) |

The CI stack is the "factory" that produces the Runtime stack. You bootstrap the factory once, and it builds everything else automatically.

---

## Real Example: PDP Pipeline

From `omni-web-catalog-pdp/bin/solution.ts`:

```typescript
const environment = createEnvironment(
  process.env.environmentName,  // e.g., "preprod"
  'omni-web-catalog',           // service name
  'pdp',                        // component name
);

const servicePipelineStack = new ServicePipelineStack(app, 'CI', {
  branch: process.env.branch,   // "main"
  repo: process.env.repo,       // "omni-web-catalog-pdp"
  project: process.env.project, // "omni-web-catalog-pdp"
  environment: environment,
  stackName: `${process.env.project}-ci`,
  intTestEnabled: false,
  butlerStackTag,
});
```

Deploy it once:
```bash
project="omni-web-catalog-pdp" \
repo="omni-web-catalog-pdp" \
branch="main" \
environmentName="preprod" \
npx cdk deploy
```

After this, every push to `main` triggers the full pipeline automatically.

---

## Build Environment

All CodeBuild steps share these defaults:

| Setting | Value |
|---------|-------|
| **Node.js** | 24 |
| **Architecture** | ARM64 (Graviton) |
| **Compute** | SMALL |
| **Image** | Amazon Linux 2 ARM 3 |
| **Privileged** | Yes (for Docker builds) |
| **Cache** | `node_modules/**/*`, `src/node_modules/**/*` |
| **Pipeline type** | V2 (faster, event-driven) |

---

## Key Design Decisions

### Why self-mutating?
You define the pipeline in the same repo as the code. Change the pipeline → push → it updates itself. No separate "infra repo" or manual CloudFormation updates.

### Why ARM64?
Graviton instances are ~20% cheaper and ~20% faster for Node.js workloads. All builds run on ARM.

### Why CodePipeline V2?
V2 pipelines are event-driven (no polling), support parallel stages, and have better pricing for low-frequency pipelines.

### Why Playwright in the pipeline?
E2E tests run against the actual deployed environment (not localhost). The pipeline gets the preview URLs from CloudFormation outputs and passes them to Playwright. If E2E fails, you know immediately.

### Why Garbage Collection?
CDK assets (Docker images, S3 objects) accumulate over time. The GC step runs `cdk gc` with a 7-day rollback buffer, keeping costs down without risking rollback capability.

---

## Pipeline Permissions

The pipeline needs specific IAM permissions:

- **CodeArtifact** — read `@hema/*` packages from the private registry
- **Secrets Manager** — read Sanity credentials, basic auth for E2E
- **EC2 Describe** — CDK context lookups (VPC, subnets)
- **SSM Parameters** — read infrastructure config
- **CloudFormation + ECR + S3** — garbage collection of stale assets

These are defined in `ServicePipelineStack.createBuildPolicy()` and applied to all CodeBuild steps.

---

## Feature Branch Pipeline (Butler)

The main pipeline handles `main` branch deployments. For feature branches, [Butler](/developertrainings-golden-path-docs-experiment/golden-path/ci-cd/butler-feature-sandboxes/) provides ephemeral sandbox environments using `buildspec-ci.yaml`.

The key difference:
- **Main pipeline**: Full pipeline with synth → self-mutate → deploy → E2E → GC
- **Butler**: Single CodeBuild run that does install → build → `cdk deploy` (no self-mutation, no E2E)

---

## Adding Your Own Pipeline

To create a pipeline for a new MFE:

1. Copy the `lib/pipeline/` folder from an existing MFE (e.g., PDP)
2. Update `bin/solution.ts` with your service/component names
3. Add `@hema/common-types`, `@hema/monitoring-constructs`, and `@hema/omni-web-gateway-management-library-constructs` to your CDK dependencies
4. Run the one-time deploy:
   ```bash
   project="your-service-name" \
   repo="your-repo-name" \
   branch="main" \
   environmentName="preprod" \
   npx cdk deploy
   ```
5. Push to `main` — the pipeline takes over from here

---

## Related

- [Butler & Feature Sandboxes](/developertrainings-golden-path-docs-experiment/golden-path/ci-cd/butler-feature-sandboxes/) — ephemeral environments for feature branches
- [Testing Strategy](/developertrainings-golden-path-docs-experiment/golden-path/ci-cd/testing-strategy/) — unit, integration, and E2E testing patterns
- [CDK Infrastructure](/developertrainings-golden-path-docs-experiment/golden-path/infrastructure/cdk-infrastructure/) — the runtime stack in detail
