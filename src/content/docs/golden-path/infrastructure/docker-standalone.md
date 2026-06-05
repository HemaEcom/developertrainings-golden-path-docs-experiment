---
title: "Docker & Standalone Build"
sidebar:
  order: 2
---

> **Reference**: [omni-web-content-frontend/src/Dockerfile](https://github.com/HemaEcom/omni-web-content-frontend/blob/main/src/Dockerfile)

## Why Standalone?

MFEs run on ECS Fargate as Docker containers. Next.js's `output: 'standalone'` produces a self-contained build with only the files needed to run — reducing image size from ~1GB+ to ~200-300MB.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',
  // ...
};
```

With `output: 'standalone'`, `next build` produces:
- `.next/standalone/` — A minimal Node.js server with only required dependencies
- `.next/standalone/server.js` — The entry point
- `.next/static/` — Static assets (CSS, JS chunks)
- `public/` — Public files

This reduces the Docker image from ~1GB+ to ~200-300MB.

---

## The Dockerfile

The Dockerfile uses a multi-stage build:

```dockerfile
# syntax=docker/dockerfile:1
FROM public.ecr.aws/docker/library/node:22-slim AS builder
WORKDIR /app

COPY package*.json ./

# Install dependencies using CodeArtifact token (BuildKit secret)
RUN --mount=type=secret,id=NPM_TOKEN \
  NPM_TOKEN=$(cat /run/secrets/NPM_TOKEN) && \
  echo "registry=https://registry.npmjs.org/" > ~/.npmrc && \
  echo "@hema:registry=https://hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/" >> ~/.npmrc && \
  echo "//hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/:_authToken=${NPM_TOKEN}" >> ~/.npmrc

RUN npm ci
RUN rm -f ~/.npmrc

COPY . .

# Build Next.js with environment variables passed as BuildKit secrets
ENV CI_DOCKER_BUILD=true

RUN --mount=type=secret,id=SANITY_API_READ_TOKEN \
  --mount=type=secret,id=NEXT_PUBLIC_SANITY_PROJECT_ID \
  --mount=type=secret,id=NEXT_PUBLIC_SANITY_DATASET \
  --mount=type=secret,id=NEXT_PUBLIC_SANITY_API_VERSION \
  --mount=type=secret,id=NEXT_PUBLIC_SANITY_STUDIO_URL \
  --mount=type=secret,id=NEXT_PUBLIC_BASE_URL \
  --mount=type=secret,id=NEXT_PUBLIC_RETAIL_MEDIA_TEST_MODE \
  --mount=type=secret,id=NEXT_PUBLIC_SERVICE_ID \
  --mount=type=secret,id=BASE_API_URL \
  --mount=type=secret,id=BASE_COMMERCE_API_URL \
  export SANITY_API_READ_TOKEN=$(cat /run/secrets/SANITY_API_READ_TOKEN) && \
  export NEXT_PUBLIC_SANITY_PROJECT_ID=$(cat /run/secrets/NEXT_PUBLIC_SANITY_PROJECT_ID) && \
  # ... other exports ... \
  npm run build

# ---- Runtime (minimal image) ----
FROM public.ecr.aws/docker/library/node:22-slim AS runner
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Ensure the cache directory exists and is writable
RUN mkdir -p .next/cache

EXPOSE 80

ENV PORT=80
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## Build Stages Explained

### Stage 1: Builder

1. **Base image**: `node:22-slim` (matches the Node.js version in `engines`)
2. **Install dependencies**: Uses BuildKit secrets to authenticate with CodeArtifact for `@hema` packages
3. **Build**: Runs `next build` with environment variables injected via BuildKit secrets
4. **Output**: `.next/standalone/`, `.next/static/`, `public/`

### Stage 2: Runner

1. **Base image**: Same `node:22-slim` (minimal runtime)
2. **Copy only what's needed**:
   - `.next/standalone/` → the self-contained server
   - `public/` → static public assets
   - `.next/static/` → compiled CSS/JS chunks
3. **Create cache dir**: Next.js ISR/data cache needs a writable directory
4. **Expose port 80**: The ECS task definition maps container port 3000 → but the Dockerfile uses 80

> Note: The container port in the Dockerfile (`80`) and the CDK config (`containerPort: 3000`) must align. Check your specific setup — the reference repo uses port 3000 in CDK.

---

## Environment Variables: Build Time vs Runtime

### Build-time variables (`NEXT_PUBLIC_*`)

Variables prefixed with `NEXT_PUBLIC_` are **inlined into the JavaScript bundle** at build time. They cannot be changed after the build.

These are passed as BuildKit secrets during the Docker build:
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SERVICE_ID`
- `NEXT_PUBLIC_BASE_URL`

### Runtime variables

Variables without the `NEXT_PUBLIC_` prefix are available at runtime via `process.env` in server components and API routes:
- `PORT`
- `HOSTNAME`
- `AWS_REGION`
- `KONG_API_TOKEN_SECRET_ARN`
- `SANITY_API_READ_TOKEN`

These are injected by the ECS task definition (set in the CDK runtime stack).

### Why BuildKit Secrets?

BuildKit secrets (`--mount=type=secret`) are used instead of `ARG`/`ENV` because:
- They don't persist in image layers (security)
- They're only available during the specific `RUN` step
- They can't be extracted from the final image

---

## How CDK Builds the Docker Image

The `EcsNextJsBundle` construct points to the `src/` directory as the Docker build context:

```typescript
const NextJsEcs = new EcsNextJsBundle(this, 'App', {
  dockerImagePath: join(import.meta.dirname, '../../src'),
  containerPort: 3000,
  // ...
});
```

CDK's `DockerImageAsset` handles:
1. Building the Docker image from `src/Dockerfile`
2. Pushing it to ECR (Elastic Container Registry)
3. Referencing it in the ECS task definition

The pipeline's `pre_build` phase fetches all secrets from SSM/Secrets Manager and passes them to the Docker build.

---

## Health Check

The ECS service uses a health check endpoint:

```typescript
healthCheckPath: '/api/health',
```

Create this in your Next.js app:

```typescript
// src/app/api/health/route.ts
export function GET() {
  return Response.json({ status: 'ok' });
}
```

The ALB checks this endpoint to determine if the container is healthy.

---

## Local Docker Build (for testing)

```bash
cd src

# Build with secrets (requires CodeArtifact token)
CODEARTIFACT_TOKEN=$(aws codeartifact get-authorization-token --domain hema-prod --domain-owner 715027721839 --query authorizationToken --output text)

docker build \
  --secret id=NPM_TOKEN,env=CODEARTIFACT_TOKEN \
  --secret id=NEXT_PUBLIC_SERVICE_ID,src=<(echo "omni-web-content") \
  --secret id=NEXT_PUBLIC_SANITY_PROJECT_ID,src=<(echo "your-project-id") \
  # ... other secrets \
  -t your-service:local .

# Run locally
docker run -p 3000:80 your-service:local
```

---

## Key Points

- `output: 'standalone'` in `next.config.ts` is **required** for ECS deployment
- The Dockerfile lives in `src/` (same directory as the Next.js app)
- Use BuildKit secrets for build-time env vars (never `ARG` for sensitive values)
- The runner stage is minimal — only standalone output + public + static
- Container port must match what CDK expects (`containerPort` in `EcsNextJsBundleProps`)

---

## Further Reading

- [CDK Infrastructure Guide](./cdk-infrastructure.md) — How the ECS service is deployed
- [Next.js Standalone Output docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
