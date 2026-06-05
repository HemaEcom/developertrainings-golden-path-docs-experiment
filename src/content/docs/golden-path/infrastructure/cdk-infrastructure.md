---
title: "CDK Infrastructure"
sidebar:
  order: 1
---

> **Reference implementations**: [omni-web-content-frontend](https://github.com/HemaEcom/omni-web-content-frontend) | [omni-web-catalog-pdp](https://github.com/HemaEcom/omni-web-catalog-pdp) (both use the same infrastructure pattern)

## How MFEs Run on AWS

Every customer-facing MFE runs on AWS, deployed and managed entirely through CDK (Cloud Development Kit). You don't configure AWS resources manually — CDK code defines everything, and pipelines deploy it automatically.

The infrastructure follows a **two-stack model**:

| Stack | What it does | Who deploys it |
|-------|-------------|----------------|
| **CI Stack** (`-ci`) | CodePipeline that builds, tests, and deploys | Developer (one-time `cdk deploy`) |
| **Runtime Stack** (`-rt`) | ECS Fargate + ALB + VPC Origin + Gateway Registration + Monitoring | The CI pipeline (automatic on every push to main) |

**Key rule:** Pipelines do not deploy pipelines. You deploy the CI stack manually once; from then on, every push to `main` triggers the pipeline which deploys the runtime stack.

## Architecture

```d2
direction: down

ci: "CI Stack" {
  style.fill: "#FFF3E0"

  source: GitHub {
    icon: https://icons.terrastruct.com/dev%2Fgithub.svg
    shape: rectangle
  }
  build: "Build & Test" {
    icon: https://icons.terrastruct.com/aws%2FDeveloper%20Tools%2FAWS-CodeBuild.svg
    shape: rectangle
  }
  synth: "CDK Synth" {
    shape: rectangle
  }
  deploy: Deploy {
    icon: https://icons.terrastruct.com/aws%2FDeveloper%20Tools%2FAWS-CodePipeline.svg
    shape: rectangle
  }

  source -> build -> synth -> deploy
}

rt: "Runtime Stack" {
  style.fill: "#E3F2FD"

  vpc_origin: "VPC Origin" {
    icon: https://icons.terrastruct.com/aws%2FNetworking%20&%20Content%20Delivery%2FAmazon-CloudFront.svg
    shape: rectangle
  }
  alb: ALB {
    icon: https://icons.terrastruct.com/aws%2FNetworking%20&%20Content%20Delivery%2FElastic-Load-Balancing.svg
    shape: rectangle
  }
  ecs: "ECS Fargate" {
    icon: https://icons.terrastruct.com/aws%2FCompute%2FAmazon-Elastic-Container-Service.svg
    shape: rectangle
  }
  monitoring: CloudWatch {
    icon: https://icons.terrastruct.com/aws%2FManagement%20&%20Governance%2FAmazon-CloudWatch.svg
    shape: rectangle
  }

  vpc_origin -> alb -> ecs
  ecs -> monitoring
}

cloudfront: "CloudFront Gateway" {
  icon: https://icons.terrastruct.com/aws%2FNetworking%20&%20Content%20Delivery%2FAmazon-CloudFront.svg
  shape: rectangle
}

ci.deploy -> rt: deploys
cloudfront -> rt.vpc_origin: "private connectivity"
```

**Traffic flow:** User → CloudFront Gateway → VPC Origin (private) → ALB → ECS Fargate container (your Next.js app)

---

## Directory Structure

```
lib/
├── common/                          # Reusable low-level constructs
│   ├── alarms/                      # Alarm sensitivity config
│   ├── alb/                         # Application Load Balancer
│   ├── cloudfront/                  # VPC Origin + RAM resource share
│   ├── ecs/                         # Cluster, service, task definition
│   └── parameters/                  # SSM Parameter Store base class
├── components/
│   └── ecs-nextjs.bundle.ts         # L3 construct: ECS + ALB + VPC Origin
├── pipeline/
│   ├── pipeline-stack.ts            # CodePipeline V2 definition
│   ├── pipeline-stage.ts            # CDK Stage for deployment
│   └── pipeline-parameters.ts       # Pipeline SSM parameters
└── runtime/
    ├── runtime-stack.ts             # Full runtime stack
    ├── runtime-parameters.ts        # Runtime SSM parameters
    ├── gateway-environments.ts      # Gateway zone/route builder
    └── gateway-routes-config.json   # Route definitions
```

---

## The EcsNextJsBundle (L3 Construct)

This is the core building block — it bundles everything needed to run a Next.js app on ECS:

```typescript
export class EcsNextJsBundle extends Construct {
  constructor(scope: Construct, id: string, props: EcsNextJsBundleProps) {
    // 1. ECS Cluster (Fargate)
    this.ecsCluster = new EcsCluster(this, 'Cluster', { ... });

    // 2. ECS Service (task def, auto-scaling, Docker image)
    this.ecsService = new EcsService(this, 'EcsService', {
      dockerImagePath: props.dockerImagePath,
      containerPort: props.containerPort,
      cpu: props.cpu,           // e.g., '1024'
      memoryMiB: props.memoryMiB, // e.g., '2048'
      enableSpot: props.enableSpot,
    });

    // 3. ALB with health checks
    this.alb = new Alb(this, 'Alb', {
      healthCheckPath: props.healthCheckPath, // '/api/health'
    });

    // 4. VPC Origin (private connectivity from CloudFront)
    this.vpcOrigin = new VpcOrigin(this, 'VpcOrigin', { ... });

    // 5. RAM Resource Share (cross-account for gateway)
    this.resourceShare = new VpcOriginResourceShare(this, 'ResourceShare', {
      principalAccountId: props.gatewayAccountId,
    });
  }
}
```

| Component | What it does |
|-----------|-------------|
| ECS Cluster | Fargate cluster with capacity provider |
| ECS Service | Runs Docker container, handles auto-scaling |
| ALB | Routes traffic to ECS tasks, health checks |
| VPC Origin | Private connectivity from CloudFront (no public ALB) |
| RAM Resource Share | Shares VPC Origin with gateway account |

---

## Runtime Stack

Wires the bundle with gateway registration and monitoring:

```typescript
export class ServiceRuntimeStack extends Stack {
  constructor(scope, id, props) {
    // Look up existing VPC
    const vpc = Vpc.fromLookup(this, 'Vpc', { vpcId: params.resolved.vpcId });

    // Deploy ECS + ALB + VPC Origin
    const NextJsEcs = new EcsNextJsBundle(this, 'App', {
      dockerImagePath: join(import.meta.dirname, '../../src'),
      containerPort: 3000,
      cpu: '1024',
      memoryMiB: '2048',
      healthCheckPath: '/api/health',
      enableSpot: props.environment.temporary ?? false,
      ecsEnvironment: { /* env vars from SSM */ },
      ecsSecrets: { /* secrets from Secrets Manager */ },
    });

    // Register routes with the gateway
    new GatewayRegistration(this, 'GatewayRegistration', {
      zones: buildGatewayZones(config, 'content', props.environment.name, origin),
    });

    // Monitoring (non-temporary environments only)
    if (!props.environment.temporary) {
      const publisher = new AlertPublisher(this, 'AlertPublisher', { ... });
      publisher.subscribeAlarms(...NextJsEcs.getAlarms());
    }
  }
}
```

---

## Pipeline Stack

CodePipeline V2 stages:

1. **Source** — GitHub via CodeStar connection
2. **Synth** — Install deps, lint, test, build Next.js, `cdk synth`
3. **Deploy** — Deploy runtime stack (manual approval for prod)
4. **GarbageCollect** — Clean up stale CDK assets and ECR images

```typescript
synth: new ShellStep('Synth', {
  commands: [
    'npm run co:login',     // CodeArtifact login
    'npm ci',
    'cd src && npm ci && cd ..',
    'npm run lint',
    'npm run test',
    'npm run build',        // Next.js build (Docker)
    'npm run cdk synth',
  ],
}),
```

Build environment: ARM (Amazon Linux 2023), Node 22, Docker-privileged (for image builds).

---

## Environment Configuration (SSM)

All runtime config is in AWS SSM Parameter Store:

| Parameter | Purpose |
|-----------|---------|
| `/nordcloud/ntwk/prov-mainvpc-vpcid` | VPC ID |
| `/hema/global/gateway/account-id` | Gateway account for RAM |
| `/hema/{service}/{env}/base-url` | Public base URL |
| `/hema/{service}/sanity/project-id` | Sanity project ID |
| `/hema/{service}/{env}/sanity/dataset` | Sanity dataset |
| `/hema/{service}/{env}/log-level` | Log level |

---

## Deploying Your First Stack

```bash
# One-time: deploy the CI pipeline
project="{service}-{component}" \
repo="{repository-name}" \
branch="main" \
environmentName="preprod" \
npx cdk deploy
```

After this, every push to `main` automatically builds and deploys the runtime stack.

---

## Spot Instances for Sandboxes

Feature branch stacks (Butler) use Fargate Spot to reduce costs:

```typescript
enableSpot: props.environment.temporary ?? false,
```

Production and pre-production use on-demand capacity for reliability.

---

## Key Dependencies

```json
{
  "aws-cdk-lib": "2.250.0",
  "constructs": "^10.6.0",
  "@hema/monitoring-constructs": "3.2.1",
  "@hema/omni-web-gateway-management-library-constructs": "2.7.0"
}
```

---

## Next Steps

- [Docker & Standalone Build](./docker-standalone) — How the Next.js app is packaged into a container
- [Gateway Registration](../gateway/gateway-registration) — How routes are registered with CloudFront
- [Butler & Feature Sandboxes](../ci-cd/butler-feature-sandboxes) — Automatic sandbox environments for feature branches
