---
title: "Internationalization (i18n)"
---


> Source: [omni-web-content-frontend i18n/](https://github.com/HemaEcom/omni-web-content-frontend/tree/main/src/i18n) | Library: `next-intl` v4.x
> Locales: nl-nl, nl-be, fr-fr, fr-be, de-de | Domains: hema.nl, hema.com

---

## Overview

HEMA serves multiple markets with a **multi-domain, multi-locale** setup:

| Domain | Locales | Prefix Strategy |
|--------|---------|-----------------|
| `hema.nl` | `nl-nl` | Never (no prefix needed) |
| `hema.com` | `nl-be`, `fr-fr`, `fr-be`, `de-de` | Always (locale in URL path) |

This is implemented using `next-intl` with domain-based routing.

---

## Setup

### 1. Install next-intl

```bash
npm install next-intl
```

### 2. Define Supported Locales

In `utils/constants.ts`:

```ts
export const ALL_SUPPORTED_LOCALES = ['nl-nl', 'nl-be', 'fr-fr', 'fr-be', 'de-de'] as const;
export type SupportedLocale = (typeof ALL_SUPPORTED_LOCALES)[number];
```

### 3. Configure Routing

Create `i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing';
import { ALL_SUPPORTED_LOCALES } from '@/utils/constants';

const stripProtocol = (url: string) => url.replace(/^https?:\/\//, '');

const domainNL = stripProtocol(process.env.NEXT_PUBLIC_DOMAIN_NL || 'nl.localhost:3000');
const domainCOM = stripProtocol(process.env.NEXT_PUBLIC_DOMAIN_COM || 'com.localhost:3000');

export const routing = defineRouting({
  locales: ALL_SUPPORTED_LOCALES,
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

**Key decisions:**
- `localeDetection: false` — No automatic browser detection (gateway handles routing)
- `hema.nl` never shows a locale prefix (single locale domain)
- `hema.com` always shows a locale prefix (`/nl-be/`, `/fr-fr/`, etc.)
- Domains are configurable via env vars for local dev vs production

### 4. Configure Request Handler

Create `i18n/request.ts`:

```ts
import { getRequestConfig } from 'next-intl/server';
import { deepMerge } from '@/utils/deep-merge';
import { routing } from './routing';

async function loadBuildTimeMessages(locale: string) {
  return (
    await import(`../locale-messages/${locale}.json`).catch(
      () => import(`../locale-messages/${routing.defaultLocale}.json`),
    )
  ).default;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || routing.defaultLocale;
  const safeLocale = locale.toLowerCase();
  const buildTimeMessages = await loadBuildTimeMessages(safeLocale);

  try {
    const { fetchMicrocopy } = await import('@/repositories/sanity/microcopy-repository');
    const runtimeMessages = await fetchMicrocopy(safeLocale);
    return {
      locale: safeLocale,
      messages: deepMerge(buildTimeMessages, runtimeMessages),
    };
  } catch (error) {
    console.error(`[i18n] CMS fetch failed for ${safeLocale}, using build-time:`, error);
    return { locale: safeLocale, messages: buildTimeMessages };
  }
});
```

**Translation loading strategy:**
1. Load build-time JSON messages from `locale-messages/{locale}.json`
2. Fetch runtime microcopy from Sanity CMS
3. Deep-merge both (CMS overrides build-time)
4. Fallback to build-time only if CMS fetch fails

### 5. Configure Middleware

Create `middleware.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest): NextResponse {
  const response = intlMiddleware(request);

  // Expose pathname via header for server components
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

### 6. Create Navigation Helper

Create `i18n/navigation.ts`:

```ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

---

## App Router Structure

With i18n, your app directory uses a `[locale]` dynamic segment:

```
src/app/
├── layout.tsx              # Root layout (wraps with NextIntlClientProvider)
├── page.tsx                # Root page (redirects to default locale)
├── not-found.tsx           # 404 page
├── [locale]/               # Locale-specific routes
│   ├── layout.tsx          # Locale layout
│   ├── page.tsx            # Home page
│   └── [...slug]/          # Dynamic content pages
│       └── page.tsx
└── api/                    # API routes (no locale)
```

---

## Translation Files

Store build-time translations in `locale-messages/`:

```
locale-messages/
├── nl-nl.json
├── nl-be.json
├── fr-fr.json
├── fr-be.json
└── de-de.json
```

**Syncing translations from CMS:**

```bash
npm run sync:translations
```

This runs `scripts/microcopy/sync-microcopy.ts` which fetches translations from Sanity and writes them to the JSON files for build-time inclusion.

---

## Using Translations in Components

```tsx
import { useTranslations } from 'next-intl';

export function ProductCard({ product }) {
  const t = useTranslations('product');

  return (
    <div>
      <h2>{product.name}</h2>
      <button>{t('addToCart')}</button>
      <span>{t('price', { amount: product.price })}</span>
    </div>
  );
}
```

---

## Local Development

For local development with multiple domains, configure your `/etc/hosts`:

```
127.0.0.1 nl.localhost
127.0.0.1 com.localhost
```

Set environment variables:
```env
NEXT_PUBLIC_DOMAIN_NL=nl.localhost:3000
NEXT_PUBLIC_DOMAIN_COM=com.localhost:3000
```

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_DOMAIN_NL` | Dutch domain | `hema.nl` |
| `NEXT_PUBLIC_DOMAIN_COM` | International domain | `hema.com` |

---

## Reference Implementation

See `omni-web-content-frontend/src/`:
- `i18n/routing.ts` — Domain and locale configuration
- `i18n/request.ts` — Translation loading with CMS fallback
- `i18n/navigation.ts` — Navigation helpers
- `middleware.ts` — Locale middleware
- `locale-messages/` — Build-time translation files
- `scripts/microcopy/sync-microcopy.ts` — CMS sync script
