# CMS Deployment — Pipeline & Environments

> **Source**: `omni-cms-composable-cms/infrastructure/lib/pipeline/pipeline-stack.ts`, `scripts/deploy.sh`

## Deployment Model

The CMS has a **dual deployment**:
1. **Sanity Studio** — Deployed to Sanity's hosting (`<host>.sanity.studio`)
2. **Runtime Infrastructure** — CDK stack with DAM sync Lambda, SQS queues, Kafka pipe (deployed to AWS)

Both are managed by a single CodePipeline per environment.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CodePipeline                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│  │  Source   │──▶│    Synth     │──▶│   Deploy Runtime       │  │
│  │ (GitHub)  │   │  (Build +    │   │   (CDK: DAM sync,     │  │
│  │           │   │   Validate)  │   │    SQS, Lambda)        │  │
│  └──────────┘   └──────────────┘   └────────────────────────┘  │
│                                              │                   │
│                                              ▼                   │
│                                     ┌────────────────────────┐  │
│                                     │  Deploy Studio         │  │
│                                     │  (sanity deploy)       │  │
│                                     └────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Pipeline Stages

### Synth Step (All Environments)

```bash
aws codeartifact login --tool npm --repository main --domain hema-prod ...
npm ci
npm run typecheck
npm run lint
npm run validate-schema    # Validates Sanity schema
npm i -g aws-cdk
npm run cdk:synth
npm run build              # Builds Sanity Studio
```

### Mainline Deploy (prod, preprod, staging)

```bash
npm ci
sanity documents validate -y                    # Validates all documents
for file in ./migrations/*.ts; do
  sanity migration run "$file" --dataset $DATASET  # Runs pending migrations
done
sanity deploy --yes                             # Deploys Studio
```

### Feature Deploy (sandbox)

```bash
# Pre-step: Create sandbox dataset
npx ts-node infrastructure/lib/scripts/create-sandbox.ts

# Post-step: Deploy Studio + CORS
sanity deploy --yes
sanity cors add $CORS_ORIGIN --credentials
```

### Sandbox Cleanup (Manual Approval)

After manual approval, the pipeline:
1. Undeploys the Studio (`sanity undeploy`)
2. Deletes CORS origin
3. Deletes the runtime CloudFormation stack
4. Deletes the FeatureStage CloudFormation stack

## Environment Configuration

### Stages

| Stage | Trigger | Branch | Dataset |
|-------|---------|--------|---------|
| `prod` | Push to `main` | `main` | `production` |
| `preprod` | Push to `main` | `main` | `preprod` |
| `staging` | Git tag | `main` | `staging` |
| `sandbox` | Push to `feature/*` | `feature/*`, `fix/*`, `chore/*` | `<branch>_sandbox` |

### Sandbox Naming Convention

For branch `feature/cofi-123`:
- **Dataset**: `cofi_123_sandbox`
- **Studio host**: `cofi-123-sandbox-hema-cms`
- **Studio URL**: `https://cofi-123-sandbox-hema-cms.sanity.studio`

## Local Deployment

### Prerequisites

```bash
# 1. AWS credentials
aws sso login --profile <profile>

# 2. Fetch environment secrets
npm run environment:set:sandbox   # Creates .env.sandbox
npm run environment:set:preprod   # Creates .env.preprod
```

### Deploy to Sandbox

```bash
npm run deploy:sandbox
# Equivalent to: ./scripts/deploy.sh -s sandbox -p <profile>
```

### Deploy Script Behavior

The `deploy.sh` script:
1. Validates branch name format (`feature/word-word`, `fix/word-word`, `chore/word-word`)
2. Blocks non-`main` branches from deploying to prod/preprod/staging
3. Loads environment variables from `.env.<stage>`
4. For sandbox: overrides dataset and studio host based on branch name
5. Runs `cdk deploy --all`

### Deploy Wizard

```bash
npm run deploy:wizard
# Interactive wizard that guides through stage selection and deployment
```

## Branch Deletion Webhook

When a feature branch is deleted on GitHub, a webhook triggers cleanup:
- Deletes the sandbox CloudFormation stack
- Triggered via Lambda function (`DeleteCloudFormationStackLambda`)
- Only active on `preprod` pipeline (which watches for branch deletions)

## Tag-Triggered Staging

The staging pipeline uses `triggerOnPush: false` and instead is triggered by git tags. A `TagTriggerWebhook` Lambda listens for tag events and starts the pipeline.

## CDK Infrastructure

The runtime stack deploys:
- **DamSyncKafka** — Kafka pipe + SQS + DAM sync Lambda
- **AssetCleanupScheduler** — Scheduled asset cleanup Lambda

```typescript
export class ServiceRuntimeStack extends Stack {
  constructor(scope, id, props) {
    new DamSyncKafka(this, "DamSyncKafka", { ...props, ...params.resolved });
    new AssetCleanupScheduler(this, "AssetCleanupScheduler", { ...props });
  }
}
```

## Build Environment

- **Compute**: Lambda 8GB (CodeBuild)
- **Image**: Amazon Linux 2023 Node 22
- **CodeArtifact**: `@hema` packages from `hema-prod` domain

## Common Operations

### Run Schema Validation Locally

```bash
npm run validate-schema
```

### Run Migrations Locally

```bash
npx sanity migration run migrations/<migration-name>.ts --dataset <dataset>
```

### Check Studio Build

```bash
npm run build
```

### Deploy Studio Only (without CDK)

```bash
SANITY_AUTH_TOKEN=<token> npx sanity deploy --yes
```
