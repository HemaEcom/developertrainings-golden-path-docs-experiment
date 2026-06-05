---
title: "4. Core Capabilities"
description: Integrate HDS, Web Shell, i18n, CMS, testing, server actions, and API authentication
sidebar:
  order: 5
---

This is where your MFE becomes a real HEMA service. Each capability below is something you'll integrate — not all at once, but as your service needs them.

---

## UI Capabilities

Every MFE needs these three. They give your service the HEMA look, consistent navigation, and multi-language support.

```d2
direction: down

mfe: "Your MFE (Next.js)" {
  style.fill: "#E3F2FD"

  shell: "Web Shell" {
    style.fill: "#C8E6C9"
    header: "Header"
    footer: "Footer"
    analytics: "Analytics"
  }

  hds: "HDS (Tompouce)" {
    style.fill: "#BBDEFB"
    components: "Components"
    tokens: "Design Tokens"
    tailwind: "Tailwind Presets"
  }

  i18n: "i18n (next-intl)" {
    style.fill: "#FFF9C4"
    routing: "Domain routing"
    messages: "Translations"
    detection: "Locale detection"
  }

  shell -> hds -> i18n
}
```

### 1. HEMA Design System (Tompouce/HDS)

```bash
cd src/
npm install @hema/hds-components-react @hema/hds-assets @hema/hds-tailwindcss-presets
npm install -D tailwindcss@4 @tailwindcss/postcss postcss
```

**`postcss.config.mjs`:**
```javascript
const postcssConfig = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default postcssConfig;
```

**`styles/globals.css`:**
```css
@import 'tailwindcss' prefix(hds);
@import '@hema/hds-tailwindcss-presets';

@source "../node_modules/@hema/hds-components-react";
@source "../node_modules/@hema/omni-web-app-shell-shell";
```

:::note
The `prefix(hds)` ensures all Tailwind utilities are prefixed with `hds:` (e.g., `hds:bg-light-primary`). The `@source` directives tell Tailwind to scan HDS and Shell packages for class names to include.
:::

**Use the HEMA font in your layout:**
```tsx
import { hurmeHema } from '@hema/hds-assets/next/font';

<body className={`${hurmeHema.variable} root hds:bg-light-primary`}>
```

**Use components:**
```tsx
import { Button } from '@hema/hds-components-react';

export function MyComponent() {
  return <Button variant="primary">Click me</Button>;
}
```

### 2. Web Shell (Header, Footer, Analytics)

The Shell provides the consistent HEMA layout across all MFEs.

```bash
npm install @hema/omni-web-app-shell-shell @hema/omni-web-app-shell-core @hema/omni-web-app-shell-analytics
```

```tsx
import { getCategoryMenu, getFooter, getHeader, getShellDictionary } from '@hema/omni-web-app-shell-core';
import { Shell, getDetectedCountry } from '@hema/omni-web-app-shell-shell';
import { DEFAULT_CONSENT } from '@hema/omni-web-app-shell-analytics';
import { baseClient } from '@/repositories/sanity/client';

export default async function ShellLayout({ children }) {
  const locale = await getLocale();

  const [footerData, headerData, categoryMenuItems, shellDictionary] = await Promise.all([
    getFooter({ locale, client: baseClient }),
    getHeader({ locale, client: baseClient }),
    getCategoryMenu({ locale, client: baseClient }),
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

:::tip
For detailed Shell props, analytics configuration, and newsletter action setup, see the [Web Shell Integration](/developertrainings-golden-path-docs-experiment/golden-path/libraries/web-shell-integration) guide.
:::

### 3. Internationalization (i18n)

HEMA uses **next-intl** with domain-based routing:
- `hema.nl` → Dutch (nl-nl)
- `hema.com` → Belgian Dutch, French, German (nl-be, fr-fr, fr-be, de-de)

```bash
npm install next-intl
```

**`i18n/routing.ts`:**
```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['nl-nl', 'nl-be', 'fr-fr', 'fr-be', 'de-de'],
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
    { domain: 'www.hema.nl', defaultLocale: 'nl-nl', locales: ['nl-nl'], localePrefix: 'never' },
    { domain: 'www.hema.com', defaultLocale: 'nl-be', locales: ['nl-be', 'fr-fr', 'fr-be', 'de-de'], localePrefix: 'always' },
  ],
});
```

**`middleware.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest): NextResponse {
  const response = intlMiddleware(request);
  response.headers.set('x-pathname', request.nextUrl.pathname);
  response.headers.set('x-search-params', request.nextUrl.search);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|sitemap|\\.well-known|.*\\.).*)',],
};
```

:::note
The `next-intl` plugin must wrap your Next.js config (see `next.config.ts` in the [App Setup](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/04-nextjs-setup) step). For the full i18n setup including CMS-driven translations, see the [i18n guide](/developertrainings-golden-path-docs-experiment/golden-path/onboarding/i18n-setup).
:::

---

## CMS & Content

If your MFE renders editorial content (pages, blogs, promotions), you'll integrate with Sanity CMS.

```d2
direction: down

sanity: "Sanity CMS" {
  style.fill: "#C8E6C9"
  studio: "Studio (editors)"
  content: "Content (GROQ API)"
  preview: "Presentation Tool"
}

mfe: "Your MFE" {
  style.fill: "#E3F2FD"
  client: "Sanity Client"
  queries: "GROQ Queries"
  render: "Page Rendering"
}

sanity -> mfe: "content delivery"
sanity.preview -> mfe: "live preview"
```

### 4. Sanity CMS Integration

> 📐 **Architecture Decision:** [ADR-0009 — Use Sanity directly for editorial content](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786)

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

This client is used by both your page queries and the Web Shell (header/footer data).

For content modeling, GROQ query patterns, live preview setup, and draft mode, see the [CMS Integration guide](/developertrainings-golden-path-docs-experiment/golden-path/cms/overview).

---

## Data & APIs

If your MFE needs product data or backend services, you'll use Kong authentication and PODS.

```d2
direction: down

mfe: "Your MFE" {
  style.fill: "#E3F2FD"
  actions: "Server Actions"
  apollo: "Apollo Client"
}

kong: "Kong (OAuth2)" {
  style.fill: "#FFCCBC"
}

pods: "PODS (GraphQL)" {
  style.fill: "#BBDEFB"
  products: "Products"
  pricing: "Pricing"
  promotions: "Promotions"
}

mfe.actions -> kong: "get token"
kong -> mfe.apollo: "Bearer token"
mfe.apollo -> pods: "query"
```

### 5. Server Actions

> 📐 **Architecture Decision:** [ADR-0012 — Server actions vs API routes](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786). Use server actions by default; use API routes only when the endpoint must be accessible by other applications.

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

**Configure allowed origins** in `next.config.ts`:

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

### 6. Backend API Authentication (Kong)

> 📐 **Architecture Decision:** [ADR-0015 — Auth with API management (Kong)](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786). Services authenticate via OAuth2 client credentials; tokens are rotated at runtime, never baked into the app.

```typescript
// services/auth/kong-authenticator.ts
import 'server-only';

export class KongAuthenticator {
  async getToken(): Promise<string> {
    // Checks cache → refreshes proactively → fetches new token if expired
    // See full implementation in the Kong Authentication guide
  }

  async getAuthHeaders(): Promise<Headers> {
    const token = await this.getToken();
    return new Headers({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }
}
```

For the full implementation, see the [Kong Authentication guide](/developertrainings-golden-path-docs-experiment/golden-path/data-apis/kong-authentication).

### 7. GraphQL Client (Apollo for PODS)

> 📐 **Architecture Decision:** [ADR-0008 — Use PODS to get product data](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786). PODS is the single source of truth for product data.

```bash
npm install @apollo/client @apollo/client-integration-nextjs graphql
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

For PODS store IDs per country and query patterns, see the [PODS Integration guide](/developertrainings-golden-path-docs-experiment/golden-path/data-apis/pods-integration).

---

## Platform & Quality

These capabilities connect your MFE to the platform infrastructure and ensure quality.

### 8. Gateway Registration (Multi-Zone)

Your MFE registers its routes with the **omni-web-gateway** so CloudFront routes traffic to your service. This is handled by CDK using `@hema/omni-web-gateway-management-library-constructs`.

For the full CDK configuration, see the [Gateway Registration guide](/developertrainings-golden-path-docs-experiment/golden-path/gateway/gateway-registration).

### 9. Testing

HEMA uses **Vitest** for unit tests and **Playwright BDD** for end-to-end tests.

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom vite-tsconfig-paths
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

### 10. Route Groups for Layout Variants

Use **route groups** `(groupName)` to apply different layouts without affecting the URL:

```
src/app/
├── layout.tsx                    # Root layout (html, body, fonts)
├── [locale]/
│   └── (shop)/                   # Route group — Shell wraps these pages
│       ├── layout.tsx            # Shell layout (header, footer, analytics)
│       ├── [...slug]/page.tsx    # Product pages
│       └── not-found.tsx
```

### 11. Health Check Endpoint

Every MFE needs a health endpoint for ALB health checks:

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' });
}
```
