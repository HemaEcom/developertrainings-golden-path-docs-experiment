---
title: "7. Deployment"
description: Butler feature sandboxes and the production deployment flow
sidebar:
  order: 7
---

Your code is ready — now let's get it running in AWS! Here's how code flows from your branch to production, and how Butler gives you per-branch preview environments for free.

```d2
direction: down

dev: Developer {
  shape: person
}

github: GitHub {
  shape: document
  main: "main branch"
  feature: "feature/* branch"
}

pipeline: "Main Pipeline (CodePipeline)" {
  style.fill: "#E3F2FD"
}

butler: "Butler (CodeBuild)" {
  style.fill: "#C8E6C9"
}

prod: "Pre-prod / Prod" {
  style.fill: "#FFCCBC"
  shape: cloud
}

sandbox: "Feature Sandbox" {
  style.fill: "#FFF9C4"
  shape: cloud
}

dev -> github
github.main -> pipeline: "triggers"
github.feature -> butler: "triggers"
pipeline -> prod: "deploys"
butler -> sandbox: "creates (auto-deleted on merge)"
```

## Two Deployment Paths

Your MFE has two ways to reach an environment:

| Path | Trigger | What happens | Environment |
|------|---------|-------------|-------------|
| **Main pipeline** | Push to `main` | CodePipeline builds + deploys runtime stack | Pre-prod → Prod (with approval) |
| **Butler sandbox** | Push to feature branch | CodeBuild runs `buildspec-ci.yaml`, creates isolated stack | Temporary (auto-deleted on merge) |

## Production Pipeline Flow

```
Push to main
  → CodePipeline Source (pulls from GitHub via CodeStar)
  → Build (npm ci, test, lint, typecheck, build CDK)
  → Synth (cdk synth → CloudFormation template)
  → Self-Update (pipeline updates itself if changed)
  → Deploy (CloudFormation → ECS rolling update)
```

The runtime stack creates/updates: ECR image → ECS task definition → ECS service (rolling deploy, zero downtime).

## Butler Feature Sandboxes

Butler watches for branch pushes and runs `buildspec-ci.yaml`:

```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 22
  build:
    commands:
      - export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token --domain hema-prod --domain-owner 715027721839 --region eu-central-1 --query authorizationToken --output text)
      - npm config set @hema:registry https://hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/
      - npm config set //hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/:_authToken $CODEARTIFACT_AUTH_TOKEN
      - npm ci
      - cd src && npm ci --legacy-peer-deps && cd ..
      - npm run build
      - export LOWERCASE_BRANCH_NAME=$(echo "$CLEAN_BRANCH_NAME" | tr '[:upper:]' '[:lower:]')
      - project="your-service-$LOWERCASE_BRANCH_NAME" repo="your-service-name" branch="$BRANCH" butlerStackTag="$BUTLER_STACK_TAG" environmentName="$LOWERCASE_BRANCH_NAME" npx cdk deploy --require-approval=never
```

Each sandbox gets its own CloudFormation stack, ECS service, and preview URL. When the branch is merged or deleted, Butler tears down the stack automatically.

## Environment Configuration

Environment variables flow into your app through two channels:

| Channel | When | What | How |
|---------|------|------|-----|
| **Build-time** | Docker build | `NEXT_PUBLIC_*` vars baked into JS bundles | BuildKit secrets or build ARGs |
| **Runtime** | Container start | Server-side secrets, feature flags | ECS task definition env vars from SSM/Secrets Manager |

Key variables every MFE needs:

| Variable | Purpose | Build/Runtime |
|----------|---------|---------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project | Build |
| `NEXT_PUBLIC_SANITY_DATASET` | Dataset (production/staging) | Build |
| `NEXT_PUBLIC_SERVICE_ID` | Zone identifier for gateway | Build |
| `NEXT_PUBLIC_BASE_URL` | Public URL of the service | Build |
| `SANITY_API_READ_TOKEN` | Server-side Sanity access | Runtime |
| `AUTH_SECRET` | Kong OAuth credentials (JSON) | Runtime |
| `ENVIRONMENT` | test / preprod / prod | Runtime |

For the full environment landscape, see the [Environment Map](/developertrainings-golden-path-docs-experiment/golden-path/environments/environment-map).
