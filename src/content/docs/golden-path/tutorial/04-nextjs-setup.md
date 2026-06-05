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
2. **`assetPrefix`** — Prefixes all static assets with `/_zones/{service-id}/` so CloudFront routes them to your service instead of another MFE
3. **`next-intl` plugin** — Enables internationalized routing

```typescript
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Zone config derives the asset prefix from your service ID
// e.g. serviceId "omni-web-catalog-pdp" → assetPrefix "/_zones/omni-web-catalog-pdp"
const serviceId = process.env.NEXT_PUBLIC_SERVICE_ID || 'your-service';
const zonePrefix = `/_zones/${serviceId}`;

const nextConfig: NextConfig = {
  output: 'standalone',
  assetPrefix: zonePrefix,
  images: {
    path: `${zonePrefix}/_next/image`,
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/**' },
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
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```

:::note
The `/_zones/{service-id}` prefix is how the multi-zone architecture avoids asset collisions. Without it, two MFEs could serve conflicting `/_next/static/` files. See the [Multi-Zone Config](/developertrainings-golden-path-docs-experiment/golden-path/gateway/multi-zone-config) guide for the full picture.
:::

## Create the Dockerfile

The app is deployed as a Docker container on ECS Fargate. The Dockerfile uses a **multi-stage build**:
- **Builder stage** — Installs deps (including private `@hema/*` packages from CodeArtifact), builds Next.js
- **Runner stage** — Copies only the standalone output (~50MB vs ~500MB with node_modules)

```dockerfile
FROM public.ecr.aws/docker/library/node:22-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN --mount=type=secret,id=NPM_TOKEN \
  NPM_TOKEN=$(cat /run/secrets/NPM_TOKEN) && \
  echo "registry=https://registry.npmjs.org/" > ~/.npmrc && \
  echo "@hema:registry=https://hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/" >> ~/.npmrc && \
  echo "//hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/:_authToken=${NPM_TOKEN}" >> ~/.npmrc

RUN npm ci
RUN rm -f ~/.npmrc
COPY . .
RUN npm run build

# Runtime — minimal image, no source code or node_modules
FROM public.ecr.aws/docker/library/node:22-slim AS runner
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p .next/cache

EXPOSE 80
ENV PORT=80
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

:::tip
The `NPM_TOKEN` secret is injected by the CDK pipeline during build — you don't hardcode it. Locally, use `docker-build-local.sh` scripts that read from your CodeArtifact session.
:::

## App Router Structure

This is the recommended folder structure. Not all folders are needed from day one — add them as your service grows:

```
src/
├── app/
│   ├── layout.tsx              # Root layout (html, body, font, Shell)
│   ├── page.tsx                # Root page (redirect to default locale)
│   ├── not-found.tsx           # 404 page
│   ├── [locale]/               # Locale-based dynamic routing
│   │   ├── page.tsx            # Home page per locale
│   │   └── [...slugs]/        # Catch-all for CMS-driven pages
│   │       └── page.tsx
│   ├── api/
│   │   ├── health/route.ts     # ALB health check (required)
│   │   └── draft-mode/         # Sanity live preview toggle
│   ├── sitemap-index/route.ts  # Federated sitemap for SEO
│   └── sitemaps/               # Per-locale sitemap generation
├── components/                 # UI components (presentational)
├── services/                   # Business logic (orchestration)
├── repositories/               # Data access (Sanity, PODS, APIs)
├── server-actions/             # Server actions called from client components
├── clients/                    # API clients (Apollo, REST, Sanity)
├── hooks/                      # Custom React hooks
├── i18n/                       # Routing + message loading config
├── types/                      # Shared TypeScript types
├── utils/                      # Pure utility functions
├── styles/globals.css          # Tailwind + HDS imports
└── middleware.ts               # i18n routing middleware
```

**Key architectural patterns:**
- **`services/`** orchestrate business logic, calling one or more repositories
- **`repositories/`** handle data fetching (one per data source: Sanity, PODS, Commerce)
- **`server-actions/`** are the bridge between client components and server-side services
- **`clients/`** configure API clients (Apollo for GraphQL, fetch wrappers for REST)
