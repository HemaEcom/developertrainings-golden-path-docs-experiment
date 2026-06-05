# Golden Path Tutorial - Create a Frontend Service

> Source: [Confluence COCO Space - Page ID 6316654631](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6316654631)
> Version: 28 | Last synced: 2026-05-29

---

## Overview

This guide walks you through creating a production-ready Next.js micro-frontend (MFE) at HEMA. By the end, you'll have a service with:

- ✅ Next.js 15 with App Router and standalone output
- ✅ CDK infrastructure (ECS Fargate + ALB + CloudFront)
- ✅ CI/CD pipeline with CodePipeline
- ✅ HEMA Design System (Tompouce/HDS)
- ✅ Web Shell (header, footer, analytics)
- ✅ Internationalization (multi-country, multi-language)
- ✅ Sanity CMS integration with live preview
- ✅ Gateway registration (multi-zone routing)
- ✅ Testing (Vitest + Playwright BDD)
- ✅ Feature sandbox deployments (Butler)

**Reference implementations:**
- [omni-web-catalog-pdp](https://github.com/HemaEcom/omni-web-catalog-pdp) — Product pages, PODS/GraphQL, Kong auth, server actions
- [omni-web-content-frontend](https://github.com/HemaEcom/omni-web-content-frontend) — Content pages, Sanity CMS, live preview, sitemaps

---

## Prerequisites

- **SSO Access:** Active HEMA SSO account
- **AWS CLI:** Configured with HEMA credentials (via SSO)
- **Node.js:** Version 22+
- **Git:** Configured with HEMA GitHub access
- **Service Catalog Access:** https://servicecatalog.ui.hema.digital
- **Service Name:** Approved by the platform team

---

## Part 1: Foundation Setup

### Step 1: Create Service from Template

1. Go to https://servicecatalog.ui.hema.digital
2. Click **Create** → **"Create an example TypeScript service"**
3. Fill in your service details
4. Your new repo is created with this structure:

```
your-service-name/
├── bin/                    # CDK app entry points
├── lib/                    # CDK infrastructure code
│   ├── common/             # Shared constructs
│   ├── pipeline/           # CI/CD pipeline stack
│   └── runtime/            # Runtime environment stack
├── docs/                   # Service documentation
├── src/                    # Next.js application (to be created)
├── scripts/                # Helper scripts (AWS setup, env fetch)
├── cdk.json                # CDK configuration
├── package.json            # Root package.json (CDK deps)
├── buildspec-ci.yaml       # CodeBuild for Butler sandboxes
├── catalog-info.yaml       # Service Catalog metadata
└── README.md
```

### Step 2: Request AWS Accounts

Request via the [Platform Catalog form](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/architecture-principles/reference/platform-catalog/#add-aws-account).

### Step 3: AWS GitHub Connection (CodeStar)

[Request GitHub connection on AWS](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/architecture-principles/reference/platform-catalog/#aws-github-connection) — needed for CI/CD pipeline to pull source code.

### Step 4: Clone and Install

```bash
git clone git@github.com:hema-digital/your-service-name.git
cd your-service-name
npm install
```

---

## Part 2: Deploy the CI/CD Pipeline

This is a **one-time manual deployment** that creates the CodePipeline infrastructure.

```bash
project="{service}-{component}" \
repo="{repository-name}" \
branch="main" \
environmentName="preprod" \
npx cdk deploy
```

This creates two CloudFormation stacks:

| Stack | Purpose | Deployed by |
|-------|---------|-------------|
| `{project}-ci` | CodePipeline (source → build → synth → deploy) | You (once) |
| `{project}-rt` | Runtime infra (ECS, ALB, CloudFront origin) | The pipeline (on every push) |

**Key rule:** Pipelines do not deploy pipelines. You deploy `-ci` manually; the pipeline deploys `-rt`.

### Verify

1. **CloudFormation:** Both stacks show `CREATE_COMPLETE`
2. **CodePipeline:** All stages green (Source → Build → UpdatePipeline → Deploy)

### Install Butler (Feature Sandboxes)

Butler enables per-branch deployments for testing:
- [What is Butler](https://servicecatalog.ui.hema.digital/docs/default/resource/infrastructure-devops-dev-docs/devtools/releasemanagement/#the-butler-hemas-standard-solution)
- [How to install](https://github.com/HemaEcom/devops-butler/blob/develop/docs/consumers/how-to-deploy.md)

---

## Part 3: Next.js Application Setup

### Scaffold the App

```bash
npx create-next-app@latest src --typescript --tailwind --app --no-src-dir
```

Answer prompts: TypeScript ✓, ESLint ✓, Tailwind CSS ✓, `src/` directory: No, App Router ✓, Import alias `@/*` ✓

> **Note:** The Next.js app lives in the `src/` directory (not `app/`). Both reference MFEs (`omni-web-catalog-pdp`, `omni-web-content-frontend`) use `src/` as the Next.js root. This is important because the root `package.json` is for CDK infrastructure and the `src/package.json` is for the Next.js application.

### Configure `next.config.ts`

Every MFE needs `output: 'standalone'` for Docker deployment, zone-aware asset prefixing, and the `next-intl` plugin:

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
    return [
      {
        // Strip zone prefix so Next.js can match the actual route
        source: `${assetPrefix}/:path*`,
        destination: '/:path*',
      },
    ];
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

> **Key differences vs a vanilla Next.js config:**
> - `deriveZoneConfig()` calculates the `assetPrefix` and `imagesPath` based on the gateway zone routing (e.g., `/_zones/your-service/_next/`)
> - `withNextIntl()` wraps the config for internationalization support
> - The production rewrite strips the zone prefix so routes resolve correctly
> - `serverActions.allowedOrigins` must include gateway dev domains AND production domains

### Create the Dockerfile

There are two patterns in use. The **Content Frontend** uses BuildKit secrets for build-time env vars (needed for Sanity static generation). The **PDP** uses ARG placeholders since it fetches data at runtime.

**Pattern A: Runtime data fetching (PDP-style) — simpler:**
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

# Placeholder values satisfy build-time imports; real values injected at runtime via ECS
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

**Pattern B: Static generation with secrets (Content-style):**
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
ENV PORT=80
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

> **Which pattern to use?**
> - Use **Pattern A** if your pages fetch all data at runtime (SSR/ISR) — simpler, no secrets needed at build time
> - Use **Pattern B** if you pre-render pages at build time (SSG) that need CMS tokens or API keys

> **Port difference:** PDP runs on port 3000 (default), Content runs on port 80. Both are valid — the CDK runtime stack configures the ALB health check accordingly.

### App Router Structure

Follow this pattern for your routes (this matches the PDP reference implementation):

```
src/
├── app/
│   ├── layout.tsx              # Root layout (html, body, fonts, NextIntlClientProvider)
│   ├── api/
│   │   └── health/route.ts     # Health check endpoint
│   └── [locale]/               # Locale-based routing
│       └── (shop)/             # Route group — Shell wraps these pages
│           ├── layout.tsx      # Shell layout (header, footer, analytics)
│           ├── not-found.tsx   # 404 page
│           └── [...slug]/      # Dynamic catch-all pages
│               └── page.tsx
├── components/                 # React components
├── services/                   # Business logic
├── repositories/               # Data access (Sanity, APIs)
├── hooks/                      # Custom React hooks
├── i18n/                       # Internationalization config
│   └── routing.ts              # next-intl routing definition
├── types/                      # TypeScript types
├── utils/                      # Utility functions
│   └── zone-config.ts          # Gateway zone routing helper
├── clients/                    # API clients (Apollo, etc.)
├── server-actions/             # Server actions for client components
├── stores/                     # State management (Zustand)
├── messages/                   # Translation files (nl-nl.json, etc.)
├── styles/
│   └── global.css              # Global CSS with Tailwind + HDS
├── middleware.ts               # Request middleware (i18n routing)
├── Dockerfile                  # Docker build config
├── next.config.ts              # Next.js configuration
├── vitest.config.ts            # Test configuration
├── postcss.config.mjs          # PostCSS config (Tailwind)
└── package.json                # App-level dependencies
```

> **Note:** The `messages/` directory holds translation JSON files (e.g., `nl-nl.json`). Both MFEs use this convention instead of `locale-messages/`.

---

## Part 4: Core Capabilities

### Capability 1: HEMA Design System (Tompouce/HDS)

```bash
cd src/
npm install @hema/hds-components-react @hema/hds-assets @hema/hds-tailwindcss-presets
npm install -D tailwindcss@4 @tailwindcss/postcss postcss
```

> **Version note:** Both reference MFEs use `@hema/hds-components-react` and `@hema/hds-tailwindcss-presets` at version `2.1.0-rc.*`. The HDS monorepo publishes packages under `@hema/hds-*` from the `hema-design-system` repo which contains: `packages/components-react`, `packages/assets`, `packages/tailwindcss-presets`, `packages/design-tokens`, and `packages/css`.

**`postcss.config.mjs`:**
```javascript
const postcssConfig = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default postcssConfig;
```

**`styles/global.css`:**
```css
@import 'tailwindcss';
@import '@hema/hds-tailwindcss-presets';
```

**Use the HEMA font in your root layout:**
```tsx
import { hurmeHema } from '@hema/hds-assets/next/font';

// In your <html> and <body>:
<html lang={locale} className={hurmeHema.variable}>
  <body className="hds:overflow-x-hidden hds:bg-light-primary hds:dark:bg-dark-primary hds:text-light-primary hds:dark:text-dark-primary">
```

**Use components:**
```tsx
import { Button } from '@hema/hds-components-react';

export function MyComponent() {
  return <Button variant="primary">Click me</Button>;
}
```

---

### Capability 2: Web Shell (Header, Footer, Analytics)

The Shell provides the consistent HEMA layout across all MFEs. It's developed in the `omni-web-app-shell-library` repo under `library/packages/`:

| Package | NPM Name | Purpose |
|---------|----------|---------|
| `shell` | `@hema/omni-web-app-shell-shell` | Main Shell component (header, footer, layout) |
| `core` | `@hema/omni-web-app-shell-core` | Data fetching (getHeader, getFooter, getCategoryMenu, getShellDictionary) |
| `analytics` | `@hema/omni-web-app-shell-analytics` | Analytics tracking, consent management |
| `api-client` | `@hema/omni-web-app-shell-api-client` | API client for shell services |
| `platform-api` | `@hema/omni-web-app-shell-platform-api` | Platform API integration |

```bash
npm install @hema/omni-web-app-shell-shell @hema/omni-web-app-shell-core @hema/omni-web-app-shell-analytics
```

> **Version note:** Both MFEs use Shell v3 (`^3.0.0` or `3.0.0`). The Shell fetches its configuration (header links, footer content, navigation) from **Sanity CMS**.

**The Shell wraps your pages in a route group layout** (not the root layout). This is the actual PDP pattern:

**Root `layout.tsx`** — minimal, just fonts and providers:
```tsx
import { hurmeHema } from '@hema/hds-assets/next/font';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import '../styles/global.css';

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} className={hurmeHema.variable}>
      <body className="hds:overflow-x-hidden hds:bg-light-primary">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**`[locale]/(shop)/layout.tsx`** — Shell wraps content pages:
```tsx
import { getCategoryMenu, getFooter, getHeader, getShellDictionary } from '@hema/omni-web-app-shell-core';
import { Shell, getDetectedCountry } from '@hema/omni-web-app-shell-shell';
import { DEFAULT_CONSENT } from '@hema/omni-web-app-shell-analytics';

export default async function ShopLayout({ children }) {
  const locale = await getLocale();

  const [footerData, headerData, categoryMenuItems, shellDictionary] = await Promise.all([
    getFooter({ locale, client: sanityClient }),
    getHeader({ locale, client: sanityClient }),
    getCategoryMenu({ locale, client: sanityClient }),
    getShellDictionary(locale),
  ]);

  return (
    <Shell
      locale={locale}
      headerData={headerData}
      footerData={footerData}
      menuItems={categoryMenuItems}
      messages={shellDictionary}
      environment={process.env.ENVIRONMENT || 'test'}
      initialConsent={DEFAULT_CONSENT}
      pageType="content"
    >
      {children}
    </Shell>
  );
}
```

> **Key insight:** The Shell is NOT in the root layout. It's in a route group `(shop)` layout. This allows pages that don't need the Shell (e.g., product editors, embedded views) to exist without it.
---

### Capability 3: Internationalization (i18n)

HEMA uses **next-intl** (v4+) with domain-based routing:
- `hema.nl` → Dutch (nl-nl)
- `hema.com` → Belgian Dutch, French, German (nl-be, fr-fr, fr-be, de-de)

```bash
npm install next-intl
```

**`i18n/routing.ts`** (actual implementation from both MFEs):
```typescript
import { defineRouting } from 'next-intl/routing';

export const locales = ['nl-nl', 'fr-fr', 'fr-be', 'de-de', 'nl-be'] as const;

// Domains are configurable via env vars for local dev vs production.
// Gateway previewUrls may include the protocol — strip it.
const stripProtocol = (url: string) => url.replace(/^https?:\/\//, '');
const domainNL = stripProtocol(process.env.NEXT_PUBLIC_DOMAIN_NL || 'nl.localhost:3000');
const domainCOM = stripProtocol(process.env.NEXT_PUBLIC_DOMAIN_COM || 'com.localhost:3000');

export const routing = defineRouting({
  locales,
  defaultLocale: 'nl-nl',
  localeDetection: false,
  localePrefix: {
    mode: 'as-needed',
    prefixes: {
      'nl-be': '/nl-be',
      'fr-fr': '/fr-fr',
      'fr-be': '/fr-be',
      'de-de': '/de-de',
    },
  },
  domains: [
    {
      localePrefix: 'never',
      domain: domainNL,
      defaultLocale: 'nl-nl',
      locales: ['nl-nl'],
    },
    {
      localePrefix: 'always',
      domain: domainCOM,
      defaultLocale: 'nl-be',
      locales: ['nl-be', 'fr-fr', 'fr-be', 'de-de'],
    },
  ],
});
```

> **Key differences from tutorial v1:**
> - Domains use `NEXT_PUBLIC_DOMAIN_NL` / `NEXT_PUBLIC_DOMAIN_COM` env vars (not hardcoded `www.hema.nl`)
> - The `stripProtocol()` helper handles gateway preview URLs that include `https://`
> - `localePrefix: 'never'` for NL domain (no prefix), `'always'` for COM domain
> - Local dev defaults use `nl.localhost:3000` and `com.localhost:3000`

**`middleware.ts`** (actual implementation):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest): NextResponse {
  const response = intlMiddleware(request);

  // Expose the current pathname via a custom header so server components
  // can read it without depending on client-side routing.
  const rewriteUrl = response.headers.get('x-middleware-rewrite');
  const pathname = rewriteUrl
    ? new URL(rewriteUrl).pathname
    : request.nextUrl.pathname;

  response.headers.set('x-pathname', pathname);
  response.headers.set('x-search-params', request.nextUrl.search);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_zones/.+/_next/image|favicon.ico|images|sitemap|\\.well-known|.*\\.).*)',
  ],
};
```

> **Note:** The matcher pattern includes `_zones/.+/_next/image` to exclude zone-prefixed image optimization routes from middleware processing.

**Translation files** go in `messages/nl-nl.json`, `messages/nl-be.json`, etc.

---

### Capability 4: Sanity CMS Integration

Most MFEs consume content from the shared Sanity CMS.

```bash
npm install @sanity/client next-sanity @portabletext/react @sanity/image-url
```

**`repositories/sanity/client.ts`:**
```typescript
import { createClient } from '@sanity/client';

export const baseClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION!,
  useCdn: true,
  token: process.env.SANITY_API_READ_TOKEN,
});
```

**Fetching content with GROQ:**
```typescript
import { baseClient } from './client';

export async function getPageBySlug(slug: string, locale: string) {
  return baseClient.fetch(
    `*[_type == "flexibleContentPage" && slug.current == $slug && country == $country][0]`,
    { slug, country: locale.split('-')[1] }
  );
}
```

**Live Preview** is enabled via the `next-sanity` VisualEditing component and a draft-mode API route:
```typescript
// app/api/draft-mode/enable/route.ts
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  (await draftMode()).enable();
  redirect(searchParams.get('redirect') || '/');
}
```

---

### Capability 5: Gateway Registration (Multi-Zone)

Your MFE registers its routes with the **omni-web-gateway** so CloudFront knows which paths to route to your service.

This is handled by the CDK infrastructure using the `@hema/omni-web-gateway-management-library-constructs` package. Your service declares which URL paths it owns.

**Key concepts:**
- Each MFE owns specific URL paths (e.g., `/inspiratie`, `/blog`, `/acties`)
- CloudFront routes requests to the correct MFE based on path matching
- Assets are served under `/_zones/{service-id}/_next/` to avoid conflicts

See [sections/gateway/gateway-registration.md](sections/gateway/gateway-registration.md) for full CDK configuration.

---

### Capability 6: Testing

HEMA uses **Vitest** for unit tests and **Playwright BDD** for end-to-end tests.

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
npm install -D @playwright/test playwright-bdd
```

**`vitest.config.mts`:**
```typescript
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: { provider: 'v8' },
  },
});
```

**Example unit test:**
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

**Scripts in `package.json`:**
```json
{
  "test": "vitest --run",
  "test:watch": "vitest --watch",
  "test:coverage": "vitest --coverage --run",
  "e2e:bdd": "npx bddgen && playwright test"
}
```

---

### Capability 7: Server Actions

Server Actions are the recommended way to call backend services from client components. They run on the server and can access secrets directly.

```typescript
// server-actions/pods/pods.ts
'use server';

import { PodsService } from '@/services/pods/pods-service';
import { PodsRepository } from '@/repositories/pods/pods-repository';

const podsService = new PodsService(new PodsRepository());

export async function getProductData(skus: string[], locale: string) {
  return podsService.getProducts(skus, locale);
}
```

**Configure allowed origins** in `next.config.ts` for cross-domain server actions:

```typescript
experimental: {
  serverActions: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      '*.hema.nl',
      '*.hema.com',
    ],
  },
},
```

---

### Capability 8: Backend API Authentication (Kong)

MFEs that call backend APIs (PODS, Commerce) authenticate via **Kong OAuth2 client credentials**:

```typescript
// services/auth/kong-authenticator.ts
import 'server-only';

export class KongAuthenticator {
  private static tokenCache: { accessToken: string; expiresAt: number } | null = null;

  async getToken(): Promise<string> {
    if (this.isTokenValid()) return KongAuthenticator.tokenCache!.accessToken;

    const credentials = JSON.parse(process.env.AUTH_SECRET!);
    const response = await fetch(`${credentials.baseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });

    const data = await response.json();
    KongAuthenticator.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  }
}
```

The `AUTH_SECRET` is stored in AWS Secrets Manager and injected into the ECS task definition.

---

### Capability 9: GraphQL Client (Apollo for PODS)

MFEs that consume product data use **Apollo Client v4** with server-side rendering:

```bash
npm install @apollo/client@^4 @apollo/client-integration-nextjs graphql
```

```typescript
// clients/graphql/apollo-client-rsc.ts
import { registerApolloClient, ApolloClient, InMemoryCache } from '@apollo/client-integration-nextjs';
import { HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

export function createApolloQueryFn(authenticator: Authenticator) {
  const authLink = setContext(async (_, { headers }) => ({
    headers: { ...headers, authorization: `Bearer ${await authenticator.getToken()}` },
  }));

  const { query } = registerApolloClient(() => {
    const httpLink = new HttpLink({ uri: `${process.env.BASE_API_URL}/omni-products/v1/graphql` });
    return new ApolloClient({ link: from([authLink, httpLink]), cache: new InMemoryCache() });
  });

  return query;
}
```

This creates a per-request Apollo Client in React Server Components, authenticated via Kong.

---

### Capability 10: Route Groups for Layout Variants

Use **route groups** `(groupName)` to apply different layouts to different sections without affecting the URL:

```
src/app/
├── layout.tsx                    # Root layout (html, body, fonts)
├── [locale]/
│   └── (shop)/                   # Route group — Shell wraps these pages
│       ├── layout.tsx            # Shell layout (header, footer, analytics)
│       ├── [...slug]/page.tsx    # Product pages
│       └── not-found.tsx
```

This pattern lets you have pages without the Shell (e.g., embedded product editors) while keeping the URL clean.

---

### Capability 11: Dev API Proxying

Avoid CORS issues in local development by proxying API calls through Next.js rewrites. This is already built into the `next.config.ts` template above — it checks `process.env.NODE_ENV === 'development'` and adds rewrites for `BASE_API_URL`.

The PDP also proxies SFCC storefront calls for the Shell's search functionality:

```typescript
// In next.config.ts rewrites()
if (process.env.SFCC_STOREFRONT_URL) {
  devRewrites.push(
    { source: '/on/demandware.store/:path*', destination: `${process.env.SFCC_STOREFRONT_URL}/on/demandware.store/:path*` },
    { source: '/_platform/:path*', destination: `${process.env.SFCC_STOREFRONT_URL}/_platform/:path*` },
  );
}
```

---

### Capability 12: Health Check Endpoint

Every MFE needs a health endpoint for ALB health checks:

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' });
}
```

---

### Capability 13: Environment Configuration

Environment variables are managed via **AWS Secrets Manager** and **SSM Parameter Store**:

- **Build-time secrets** (Sanity tokens, API keys) → injected during Docker build via BuildKit secrets
- **Runtime env vars** (feature flags, URLs) → injected into ECS task definition

Key environment variables every MFE needs:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset (production/staging) |
| `SANITY_API_READ_TOKEN` | Server-side Sanity access |
| `NEXT_PUBLIC_BASE_URL` | Public URL of the service |
| `NEXT_PUBLIC_SERVICE_ID` | Zone identifier for gateway |
| `ENVIRONMENT` | test / preprod / prod |

---

## Part 5: CI/CD & Deployment

### `buildspec-ci.yaml` (Butler Feature Sandboxes)

This file tells Butler how to build and deploy feature branches. The two reference MFEs differ in approach:

**Content Frontend** (explicit CodeArtifact token, Node.js 22):
```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 22
    commands:
      - echo "starting BRANCH:$BRANCH , CLEAN_BRANCH_NAME:$CLEAN_BRANCH_NAME , BUTLER_STACK_TAG:$BUTLER_STACK_TAG"
  build:
    commands:
      - export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token --domain hema-prod --domain-owner 715027721839 --region eu-central-1 --query authorizationToken --output text)
      - npm config set //hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/:_authToken $CODEARTIFACT_AUTH_TOKEN
      - npm config set @hema:registry https://hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/
      - npm ci
      - cd src && npm ci --legacy-peer-deps && cd ..
      - npm run build
      - export LOWERCASE_BRANCH_NAME=$(echo "$CLEAN_BRANCH_NAME" | tr '[:upper:]' '[:lower:]')
      - project="your-service-$LOWERCASE_BRANCH_NAME" repo="your-service-name" branch="$BRANCH" butlerStackTag="$BUTLER_STACK_TAG" environmentName="$LOWERCASE_BRANCH_NAME" npx cdk deploy --require-approval=never
```

**PDP** (uses `npm run co:login`, Node.js 24):
```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 24
    commands:
      - export CLEAN_BRANCH_NAME=$(echo "$CLEAN_BRANCH_NAME" | sed 's/[^a-zA-Z0-9]*$//' | tr '[:upper:]' '[:lower:]')
  build:
    commands:
      - npm run co:login
      - npm ci
      - (cd src && npm ci)
      - npm run build
      - project="pdp-$CLEAN_BRANCH_NAME" repo="omni-web-catalog-pdp" branch="$BRANCH" butlerStackTag="$BUTLER_STACK_TAG" environmentName="$CLEAN_BRANCH_NAME" npx cdk deploy --require-approval=never
```

> **Key patterns:** Both install root deps (CDK), then `cd src && npm ci` for the Next.js app. The `project` env var controls the CloudFormation stack name.

### Deployment Flow

```
Developer pushes to main
    → CodePipeline triggers
    → Source stage (pulls code)
    → Build stage (npm install, test, lint, build)
    → Synth stage (CDK synthesize)
    → Deploy stage (CloudFormation update → ECS rolling deploy)
```

For feature branches, Butler creates isolated stacks with their own ECS service and ALB.

---

## Part 6: Local Development

### Running Locally

```bash
# From project root
cd src
npm install --legacy-peer-deps
npm run dev
```

Your app runs at `http://localhost:3000`. For multi-domain testing (NL vs COM), configure your `/etc/hosts`:
```
127.0.0.1 nl.localhost
127.0.0.1 com.localhost
```

Then access `http://nl.localhost:3000` (Dutch) or `http://com.localhost:3000/nl-be` (Belgian).

### Environment Variables for Local Dev

Create `src/.env.local`:
```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
SANITY_API_READ_TOKEN=your-token
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SERVICE_ID=your-service
ENVIRONMENT=test
```

Or fetch from AWS:
```bash
bash scripts/fetch-env-from-aws.sh
```

---

## Summary: What Every MFE Should Have

| Capability | Package/Tool | PDP Version | Content Version | Required? |
|-----------|-------------|-------------|-----------------|-----------|
| Next.js with App Router | `next` | ^16.2.6 | ^15.5.18 | ✅ |
| React 19 | `react`, `react-dom` | ^19.2.6 | ^19.2.6 | ✅ |
| Standalone Docker output | `next.config.ts` → `output: 'standalone'` | — | — | ✅ |
| HEMA Design System | `@hema/hds-components-react`, `@hema/hds-tailwindcss-presets` | 2.1.0-rc.* | ^2.1.0-rc.* | ✅ |
| Web Shell (layout) | `@hema/omni-web-app-shell-shell`, `@hema/omni-web-app-shell-core` | ^3.0.0 | 3.0.0 | ✅ |
| Analytics | `@hema/omni-web-app-shell-analytics` | ^3.0.0 | 3.0.0 | ✅ |
| Internationalization | `next-intl` | ^4.12.0 | ^4.12.0 | ✅ |
| Tailwind CSS v4 | `tailwindcss`, `@tailwindcss/postcss` | ^4.3.0 | 4.3.0 | ✅ |
| CMS Integration | `@sanity/client`, `next-sanity` | next-sanity ^12.4.5 | next-sanity ^9.12.3, @sanity/client ^7.22.0 | If content-driven |
| Server Actions | Next.js built-in + `allowedOrigins` config | — | — | ✅ |
| Kong Authentication | Custom `KongAuthenticator` + `AUTH_SECRET` | — | — | If calling backend APIs |
| GraphQL (PODS) | `@apollo/client` v4, `@apollo/client-integration-nextjs` | ^4.1.9 | — | If consuming product data |
| State Management | `zustand` | ^5.0.13 | — | If client-side state needed |
| Route Groups | `(shop)` pattern for layout variants | — | — | Recommended |
| Gateway Registration | `@hema/omni-web-gateway-management-library-constructs` | — | — | ✅ |
| Health endpoint | `/api/health` | — | — | ✅ |
| Unit tests | `vitest`, `@testing-library/react` | vitest ^4.1.6 | vitest ^3.2.4 | ✅ |
| E2E tests | `@playwright/test`, `playwright-bdd` | ^1.x | ^1.60.0, playwright-bdd ^8.5.1 | ✅ |
| Security headers | `next.config.ts` headers | — | ✓ (+ No-Vary-Search) | ✅ |
| Feature sandboxes | Butler + `buildspec-ci.yaml` | — | — | ✅ |
| CDK Infrastructure | `aws-cdk-lib`, ECS Fargate + ALB | — | — | ✅ |
| Monitoring | `@hema/monitoring-logger` | ^3.2.1 | ^3.2.1 | ✅ |

---

## What's Next

| Topic | Guide |
|-------|-------|
| CDK Infrastructure Details | [sections/infrastructure/cdk-infrastructure.md](sections/infrastructure/cdk-infrastructure.md) |
| Docker Build | [sections/infrastructure/docker-standalone.md](sections/infrastructure/docker-standalone.md) |
| Gateway Registration | [sections/gateway/gateway-registration.md](sections/gateway/gateway-registration.md) |
| Multi-Zone Config | [sections/gateway/multi-zone-config.md](sections/gateway/multi-zone-config.md) |
| Web Shell Deep Dive | [sections/libraries/web-shell-integration.md](sections/libraries/web-shell-integration.md) |
| HDS Components | [sections/libraries/hds-integration.md](sections/libraries/hds-integration.md) |
| i18n Setup | [sections/onboarding/i18n-setup.md](sections/onboarding/i18n-setup.md) |
| CMS Overview | [sections/cms/overview.md](sections/cms/overview.md) |
| Testing Strategy | [sections/ci-cd/testing-strategy.md](sections/ci-cd/testing-strategy.md) |
| Butler Sandboxes | [sections/ci-cd/butler-feature-sandboxes.md](sections/ci-cd/butler-feature-sandboxes.md) |
| Monitoring | [sections/monitoring/observability.md](sections/monitoring/observability.md) |
| Data APIs (PODS) | [sections/data-apis/pods-integration.md](sections/data-apis/pods-integration.md) |
| Environments | [sections/environments/environment-map.md](sections/environments/environment-map.md) |
| Session Sharing | [sections/data-apis/session-sharing.md](sections/data-apis/session-sharing.md) |
| Security | [sections/security/security-headers-waf.md](sections/security/security-headers-waf.md) |
| Performance & Caching | [sections/performance/caching-cdn.md](sections/performance/caching-cdn.md) |
