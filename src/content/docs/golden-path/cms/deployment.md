---
title: "CMS Deployment"
sidebar:
  order: 6
---

> **Source**: `omni-cms-composable-cms/infrastructure/lib/pipeline/pipeline-stack.ts`, `scripts/deploy.sh`

## Deployment Model

The CMS has a **dual deployment**:
1. **Sanity Studio** — Deployed to Sanity's hosting (`<host>.sanity.studio`)
2. **Runtime Infrastructure** — CDK stack with DAM sync Lambda, SQS queues, Kafka pipe (AWS)

Both are managed by a single CodePipeline per environment.

## Pipeline Flow

```d2
direction: down

source: "Source (GitHub)" {
  style.fill: "#E3F2FD"
}

synth: "Synth\n(build + validate schema)" {
  style.fill: "#FFF9C4"
}

runtime: "Deploy Runtime\n(CDK: DAM sync, SQS, Lambda)" {
  style.fill: "#E8F5E9"
}

studio: "Deploy Studio\n(sanity deploy)" {
  style.fill: "#E8F5E9"
}

source -> synth -> runtime -> studio
```

## Stages

| Stage | Trigger | Branch | Dataset |
|-------|---------|--------|---------|
| `prod` | Push to `main` | `main` | `production` |
| `preprod` | Push to `main` | `main` | `preprod` |
| `staging` | Git tag | `main` | `staging` |
| `sandbox` | Push to `feature/*` | `feature/*`, `fix/*`, `chore/*` | `<branch>_sandbox` |

### Sandbox Naming

For branch `feature/cofi-123`:
- **Dataset**: `cofi_123_sandbox`
- **Studio host**: `cofi-123-sandbox-hema-cms`
- **Studio URL**: `https://cofi-123-sandbox-hema-cms.sanity.studio`

## Pipeline Steps

### Synth (All Environments)

```bash
npm ci
npm run typecheck
npm run lint
npm run validate-schema
npm run cdk:synth
npm run build              # Builds Studio
```

### Mainline Deploy (prod, preprod, staging)

```bash
sanity documents validate -y
for file in ./migrations/*.ts; do
  sanity migration run "$file" --dataset $DATASET
done
sanity deploy --yes
```

### Feature Deploy (sandbox)

```bash
# Creates sandbox dataset
npx ts-node infrastructure/lib/scripts/create-sandbox.ts
# Deploys Studio + CORS
sanity deploy --yes
sanity cors add $CORS_ORIGIN --credentials
```

### Sandbox Cleanup

After manual approval:
1. Undeploys Studio (`sanity undeploy`)
2. Deletes CORS origin
3. Deletes CloudFormation stacks

Branch deletion webhook also triggers cleanup automatically.

## Local Deployment

### Prerequisites

```bash
aws sso login --profile <profile>
npm run environment:set:sandbox   # Creates .env.sandbox
```

### Deploy to Sandbox

```bash
npm run deploy:sandbox
# Or: ./scripts/deploy.sh -s sandbox -p <profile>
```

The deploy script validates branch name format and blocks non-`main` branches from deploying to prod/preprod/staging.

### Deploy Wizard

```bash
npm run deploy:wizard
```

Interactive wizard for stage selection and deployment.

## Common Operations

| Task | Command |
|------|---------|
| Validate schema | `npm run validate-schema` |
| Run migrations | `npx sanity migration run migrations/<name>.ts --dataset <dataset>` |
| Build Studio | `npm run build` |
| Deploy Studio only | `SANITY_AUTH_TOKEN=<token> npx sanity deploy --yes` |

## Build Environment

- **Compute**: Lambda 8GB (CodeBuild)
- **Image**: Amazon Linux 2023, Node 22
- **Packages**: `@hema` from CodeArtifact (`hema-prod` domain)
