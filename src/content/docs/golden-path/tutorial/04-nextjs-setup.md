---
title: "3. Next.js App Setup"
description: Scaffold the Next.js app, configure Docker, and define the route structure
sidebar:
  order: 4
---

Now for the fun part — let's build the actual app! You'll scaffold a Next.js project, configure it for the HEMA multi-zone architecture, and set up the Docker build.

## Scaffold the App

> 📐 **Architecture Decision:** [ADR-0003 — Teams SHOULD use Next.js](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786)

The Next.js app lives in the `src/` directory of your repo:

```bash
npx create-next-app@latest src --typescript --tailwind --app --no-src-dir
```

Answer prompts: TypeScript ✓, ESLint ✓, Tailwind CSS ✓, `src/` directory: No, App Router ✓, Import alias `@/*` ✓

After scaffolding, you'll customize three critical files: `next.config.ts`, `Dockerfile`, and `middleware.ts`.

## Configure `next.config.ts`

This config does three important things:
1. **`output: 'standalone'`** — Produces a self-contained build that runs without `node_modules` (required for Docker)
2. **`assetPrefix` via `deriveZoneConfig()`** — Prefixes all static assets with `/_zones/{service-id}/` so CloudFront routes them to your service instead of another MFE
3. **`next-intl` plugin** — Enables internationalized routing

```typescript
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { deriveZoneConfig } from './utils/zone-config';

const withNextIntl = createNextIntlPlugin();

const { assetPrefix, imagesPath } = deriveZoneConfig(
  process.env.SERVICE_ID || 'your-service-name'
);

const nextConfig: NextConfig = {
  output: 'standalone',
  assetPrefix,
  images: {
    path: imagesPath,
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/**' },
      { protocol: 'https', hostname: '*.hema.nl' },
      { protocol: 'https', hostname: '*.hema.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      const devRewrites = [];
      if (process.env.BASE_API_URL) {
        devRewrites.push({
          source: '/api/pods/:path*',
          destination: `${process.env.BASE_API_URL}/:path*`,
        });
      }
      return devRewrites;
    }
    // Production: strip zone prefix so Next.js can match routes
    return [{ source: `${assetPrefix}/:path*`, destination: '/:path*' }];
  },
  experimental: {
    serverActions: {
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
        '*.omni-web-gateway.experience-dev.hema.digital',
        '*.hema.nl',
        '*.hema.com',
      ],
    },
  },
};

export default withNextIntl(nextConfig);
```

:::note
The `deriveZoneConfig()` utility calculates `assetPrefix` (e.g., `/_zones/omni-web-catalog-pdp`) and `imagesPath` (e.g., `/_zones/omni-web-catalog-pdp/_next/image`) from your service ID. This is how the multi-zone architecture avoids asset collisions. See the [Multi-Zone Config](/developertrainings-golden-path-docs-experiment/golden-path/gateway/multi-zone-config) guide for the full picture.
:::

## Create the Dockerfile

The app is deployed as a Docker container on ECS Fargate. The Dockerfile uses a **multi-stage build**:
- **Builder stage** — Installs deps (including private `@hema/*` packages from CodeArtifact), builds Next.js
- **Runner stage** — Copies only the standalone output (~50MB vs ~500MB with node_modules)

There are two patterns in use:

**Pattern A: Runtime data fetching (PDP-style)** — simpler, uses ARG placeholders:
```dockerfile
FROM public.ecr.aws/docker/library/node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npm,target=/root/.npmrc npm ci --legacy-peer-deps
RUN rm -f .npmrc

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . ./
# Placeholders satisfy build-time imports; real values injected at runtime via ECS
ARG NEXT_PUBLIC_SANITY_PROJECT_ID=placeholder
ARG NEXT_PUBLIC_SANITY_DATASET=production
ENV NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID
ENV NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**Pattern B: Static generation with secrets (Content-style)** — for pre-rendered pages:
```dockerfile
# syntax=docker/dockerfile:1
FROM public.ecr.aws/docker/library/node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=NPM_TOKEN \
  NPM_TOKEN=$(cat /run/secrets/NPM_TOKEN) && \
  echo "@hema:registry=https://hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/" > ~/.npmrc && \
  echo "//hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/:_authToken=${NPM_TOKEN}" >> ~/.npmrc
RUN npm ci
RUN rm -f ~/.npmrc
COPY . .
RUN --mount=type=secret,id=SANITY_API_READ_TOKEN \
  --mount=type=secret,id=NEXT_PUBLIC_SANITY_PROJECT_ID \
  --mount=type=secret,id=NEXT_PUBLIC_SANITY_DATASET \
  export SANITY_API_READ_TOKEN=$(cat /run/secrets/SANITY_API_READ_TOKEN) && \
  export NEXT_PUBLIC_SANITY_PROJECT_ID=$(cat /run/secrets/NEXT_PUBLIC_SANITY_PROJECT_ID) && \
  export NEXT_PUBLIC_SANITY_DATASET=$(cat /run/secrets/NEXT_PUBLIC_SANITY_DATASET) && \
  npm run build

FROM public.ecr.aws/docker/library/node:22-slim AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p .next/cache
EXPOSE 80
ENV PORT=80 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

:::tip
**Which pattern?** Use Pattern A if your pages fetch data at runtime (SSR). Use Pattern B if you pre-render pages at build time that need CMS tokens. The `NPM_TOKEN` secret is injected by the CDK pipeline — you don't hardcode it.
:::

## App Router Structure

This is the recommended folder structure, matching the PDP reference implementation:

```
src/
├── app/
│   ├── layout.tsx              # Root layout (html, body, fonts, NextIntlClientProvider)
│   ├── api/
│   │   └── health/route.ts     # ALB health check (required)
│   └── [locale]/               # Locale-based dynamic routing
│       └── (shop)/             # Route group — Shell wraps these pages
│           ├── layout.tsx      # Shell layout (header, footer, analytics)
│           ├── not-found.tsx   # 404 page
│           └── [...slug]/      # Catch-all for pages
│               └── page.tsx
├── components/                 # UI components (presentational)
├── services/                   # Business logic (orchestration)
├── repositories/               # Data access (Sanity, PODS, APIs)
├── server-actions/             # Server actions called from client components
├── clients/                    # API clients (Apollo, REST, Sanity)
├── hooks/                      # Custom React hooks
├── i18n/                       # Routing + message loading config
│   └── routing.ts
├── types/                      # Shared TypeScript types
├── utils/                      # Pure utility functions
│   └── zone-config.ts          # Gateway zone routing helper
├── stores/                     # State management (Zustand)
├── messages/                   # Translation JSON files (nl-nl.json, etc.)
├── styles/
│   └── global.css              # Tailwind + HDS imports
├── middleware.ts               # i18n routing middleware
├── Dockerfile
├── next.config.ts
├── vitest.config.ts
├── postcss.config.mjs
└── package.json                # App-level dependencies
```

**Key architectural patterns:**
- **`services/`** orchestrate business logic, calling one or more repositories
- **`repositories/`** handle data fetching (one per data source: Sanity, PODS, Commerce)
- **`server-actions/`** are the bridge between client components and server-side services
- **`clients/`** configure API clients (Apollo for GraphQL, fetch wrappers for REST)
- **Shell lives in `(shop)/layout.tsx`** — NOT the root layout. This lets pages without the Shell (e.g., product editors) exist cleanly.
