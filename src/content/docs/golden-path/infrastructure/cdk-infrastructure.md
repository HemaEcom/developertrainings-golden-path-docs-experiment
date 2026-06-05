---
title: "CDK Infrastructure Guide"
---


> Reference implementation: [omni-web-content-frontend](https://github.com/HemaEcom/omni-web-content-frontend)

---

## Overview

Every HEMA micro-frontend (MFE) runs on AWS using a two-stack CDK architecture:

| Stack | Suffix | Deployed by | Purpose |
|-------|--------|-------------|---------|
| **CI Stack** | `-ci` | Developer (one-time `cdk deploy`) | CodePipeline V2 that builds, tests, and deploys the runtime stack |
| **Runtime Stack** | `-rt` | The CI pipeline (on every commit to main) | ECS Fargate service, ALB, VPC Origin, Gateway Registration, Monitoring |

**Key rule:** Pipelines do not deploy pipelines. The CI stack is deployed manually; it then deploys the runtime stack automatically.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CI Stack (-ci)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Source   │→ │  Build   │→ │  Synth   │→ │    Deploy     │  │
│  │ (GitHub)  │  │(npm, lint│  │(cdk synth│  │ (runtime-rt)  │  │
│  │           │  │ test)    │  │          │  │               │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Runtime Stack (-rt)                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              EcsNextJsBundle (L3 Construct)               │  │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │   ECS   │  │   ALB   │  │   VPC    │  │   RAM    │  │  │
│  │  │ Fargate │← │  + TG   │← │  Origin  │  │  Share   │  │  │
│  │  │ Service │  │         │  │          │  │          │  │  │
│  │  └─────────┘  └─────────┘  └──────────┘  └──────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────────────────┐   │
│  │ GatewayRegistration │  │ AlertPublisher + Monitoring    │   │
│  │ (routes, zones)     │  │ (CloudWatch alarms)            │   │
│  └────────────────────┘  └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
lib/
├── common/                          # Reusable low-level constructs
│   ├── alarms/                      # Alarm sensitivity configuration
│   ├── alb/                         # Application Load Balancer construct
│   ├── cloudfront/                  # VPC Origin + RAM resource share
│   ├── cloudwatch/                  # Log group construct
│   ├── ecs/                         # ECS cluster, service, task definition
│   ├── lambda/                      # Supporting Lambda functions
│   └── parameters/                  # SSM Parameter Store base class
├── components/
│   └── ecs-nextjs.bundle.ts         # L3 construct: ECS + ALB + VPC Origin
├── pipeline/
│   ├── pipeline-stack.ts            # CodePipeline V2 definition
│   ├── pipeline-stage.ts            # CDK Stage for deployment
│   ├── pipeline-parameters.ts       # Pipeline SSM parameters
│   └── integration-test.ts          # Integration test stage
└── runtime/
    ├── runtime-stack.ts             # Full runtime stack definition
    ├── runtime-parameters.ts        # Runtime SSM parameters
    ├── gateway-environments.ts      # Gateway zone/route builder
    └── gateway-routes-config.json   # Route definitions for the gateway
```

---

## The EcsNextJsBundle Construct

This is the core L3 construct that bundles everything needed to run a Next.js app on ECS:

```typescript
// lib/components/ecs-nextjs.bundle.ts (simplified)
import { EcsCluster } from '../common/ecs/cluster';
import { EcsService } from '../common/ecs/service';
import { Alb } from '../common/alb/load-balancer';
import { VpcOrigin } from '../common/cloudfront/vpc-origin';
import { VpcOriginResourceShare } from '../common/cloudfront/vpc-origin-resource-share';

export class EcsNextJsBundle extends Construct {
  public readonly ecsCluster: EcsCluster;
  public readonly ecsService: EcsService;
  public readonly alb: Alb;
  public readonly vpcOrigin: VpcOrigin;
  public readonly resourceShare?: VpcOriginResourceShare;

  constructor(scope: Construct, id: string, props: EcsNextJsBundleProps) {
    super(scope, id);

    // 1. ECS Cluster (Fargate)
    this.ecsCluster = new EcsCluster(this, 'Cluster', { env: props.env, vpc: props.vpc });

    // 2. ECS Service (task definition, auto-scaling, Docker image)
    this.ecsService = new EcsService(this, 'EcsService', {
      env: props.env,
      cluster: this.ecsCluster,
      vpc: props.vpc,
      dockerImagePath: props.dockerImagePath,
      containerPort: props.containerPort,
      cpu: props.cpu,
      memoryMiB: props.memoryMiB,
      environment: props.ecsEnvironment,
      secrets: props.ecsSecrets,
      enableSpot: props.enableSpot,
    });

    // 3. Application Load Balancer with health checks
    this.alb = new Alb(this, 'Alb', {
      env: props.env,
      ecsService: this.ecsService,
      vpc: props.vpc,
      healthCheckPath: props.healthCheckPath,
    });

    // 4. CloudFront VPC Origin (private connectivity from CloudFront to ALB)
    this.vpcOrigin = new VpcOrigin(this, 'VpcOrigin', {
      env: props.env,
      loadBalancer: this.alb.loadBalancer,
    });

    // 5. RAM Resource Share (cross-account access for the gateway)
    if (props.gatewayAccountId) {
      this.resourceShare = new VpcOriginResourceShare(this, 'ResourceShare', {
        env: props.env,
        vpcOriginArn: this.vpcOrigin.vpcOriginArn,
        principalAccountId: props.gatewayAccountId,
      });
    }
  }
}
```

### What each component does

| Component | Purpose |
|-----------|---------|
| **ECS Cluster** | Fargate cluster with capacity provider strategy |
| **ECS Service** | Runs the Docker container, handles auto-scaling, health checks |
| **ALB** | Routes traffic to ECS tasks, provides health check endpoint |
| **VPC Origin** | CloudFront VPC Origin for private connectivity (no public ALB) |
| **RAM Resource Share** | Shares the VPC Origin with the gateway account so CloudFront can access it |

---

## Runtime Stack

The runtime stack wires the EcsNextJsBundle with gateway registration and monitoring:

```typescript
// lib/runtime/runtime-stack.ts (simplified)
export class ServiceRuntimeStack extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    // Resolve SSM parameters
    const params = new RuntimeParameters(this, 'RuntimeParameters', { ... });

    // Look up existing VPC
    const vpc = Vpc.fromLookup(this, 'Vpc', { vpcId: params.resolved.vpcId });

    // Deploy the ECS + ALB + VPC Origin bundle
    const NextJsEcs = new EcsNextJsBundle(this, 'App', {
      env: props.environment,
      vpc,
      dockerImagePath: join(import.meta.dirname, '../../src'),
      containerPort: 3000,
      cpu: '1024',
      memoryMiB: '2048',
      healthCheckPath: '/api/health',
      enableSpot: props.environment.temporary ?? false,
      gatewayAccountId: params.resolved.gatewayAccountId.stringValue,
      ecsEnvironment: { /* env vars from SSM */ },
      ecsSecrets: { /* secrets from Secrets Manager */ },
    });

    // Register routes with the gateway
    const gateway = new GatewayRegistration(this, 'GatewayRegistration', {
      configurationName: props.environment.configurationName,
      clientId: '{{resolve:secretsmanager:...}}',
      clientSecret: '{{resolve:secretsmanager:...}}',
      zones: buildGatewayZones(config, 'content', props.environment.name, origin),
    });

    // Ensure RAM share exists before gateway registration
    if (NextJsEcs.resourceShare) {
      gateway.node.addDependency(NextJsEcs.resourceShare);
    }

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

The pipeline uses CodePipeline V2 with these stages:

1. **Source** — GitHub connection via CodeStar
2. **Synth** — Install deps, lint, test, build Next.js, `cdk synth`
3. **Deploy** — Deploy the runtime stack (with manual approval for prod)
4. **GarbageCollect** — Clean up stale CDK assets and ECR images

```typescript
// Key pipeline configuration
const pipeline = new CodePipeline(this, 'Pipeline', {
  pipelineType: PipelineType.V2,
  pipelineName: props.project,
  codeBuildDefaults: {
    buildEnvironment: {
      privileged: true,              // Required for Docker builds
      computeType: ComputeType.MEDIUM,
      buildImage: LinuxBuildImage.AMAZON_LINUX_2_ARM_3,
    },
    partialBuildSpec: BuildSpec.fromObject({
      phases: {
        install: { 'runtime-versions': { nodejs: 22 } },
        pre_build: {
          commands: [
            // Fetch CodeArtifact token for @hema packages
            'export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token ...)',
            // Fetch build-time secrets from SSM/Secrets Manager
            'export SANITY_API_READ_TOKEN=$(aws secretsmanager get-secret-value ...)',
            // ... other env vars
          ],
        },
      },
    }),
  },
  synth: new ShellStep('Synth', {
    commands: [
      'npm run co:login',
      'npm ci',
      'cd src && npm ci && cd ..',
      'npm run lint',
      'npm run test',
      'npm run build',
      'npm run cdk synth',
    ],
  }),
});
```

---

## Key Dependencies (root package.json)

```json
{
  "dependencies": {
    "aws-cdk-lib": "2.250.0",
    "constructs": "^10.6.0",
    "@hema/common-types": "0.3.1",
    "@hema/monitoring-constructs": "3.2.1",
    "@hema/omni-web-gateway-management-library-constructs": "2.7.0",
    "@hema/omni-web-gateway-management-library-types": "2.7.0",
    "@hema/omni-web-gateway-management-library-utils": "2.7.0"
  },
  "devDependencies": {
    "aws-cdk": "2.1122.0",
    "vitest": "^4.1.5",
    "typescript": "^5.9.3"
  }
}
```

---

## Environment Configuration (SSM Parameters)

All runtime configuration is stored in AWS SSM Parameter Store:

| Parameter Path | Purpose |
|----------------|---------|
| `/nordcloud/ntwk/prov-mainvpc-vpcid` | VPC ID for the service |
| `/hema/global/gateway/account-id` | Gateway account ID for RAM sharing |
| `/hema/global/auth` | Security credentials (Secrets Manager) |
| `/hema/{service}/{component}/{env}/log-level` | Log level per environment |
| `/hema/{service-name}/sanity/project-id` | Sanity project ID |
| `/hema/{service-name}/{env}/sanity/dataset` | Sanity dataset per environment |
| `/hema/{service-name}/{env}/base-url` | Public base URL |

---

## Deploying Your First Stack

```bash
# One-time: deploy the CI pipeline stack
project="{service}-{component}" \
repo="{repository-name}" \
branch="main" \
environmentName="preprod" \
npx cdk deploy
```

After this, every push to `main` triggers the pipeline which:
1. Builds the Next.js app into a Docker image
2. Synthesizes the CDK runtime stack
3. Deploys the runtime stack (ECS, ALB, VPC Origin, Gateway Registration)

---

## Spot Instances for Sandboxes

Feature branch (Butler) stacks use Fargate Spot to reduce costs:

```typescript
enableSpot: props.environment.temporary ?? false,
```

Production and pre-production environments use on-demand capacity for reliability.

---

## Further Reading

- [Gateway Registration Guide](../gateway/gateway-registration.md) — How routes are registered
- [Docker/Standalone Build](./docker-standalone.md) — The Dockerfile and `output: 'standalone'`
- [Butler documentation](https://github.com/HemaEcom/devops-butler/blob/develop/docs/consumers/how-to-deploy.md) — Feature sandbox automation
