---
title: "Web Shell Integration Guide"
---


> Reference repo: [omni-web-app-shell-library](https://github.com/HemaEcom/omni-web-app-shell-library)
> Current version: **3.1.1** (monorepo) / **3.0.0** (consumed by MFEs)

---

## What Is the Web Shell?

The Web Shell is a shared library that provides the unified application wrapper for all HEMA micro-frontends. It handles:

- **Header and footer** — Consistent navigation across all MFEs
- **Analytics** — GTM integration with GDPR-compliant consent management
- **Core utilities** — Data fetching for shell content (Sanity CMS), i18n, search
- **Platform API** — Client for HEMA platform services
- **API Client** — Type-safe HTTP clients generated from OpenAPI specs

Every MFE wraps its content with the Shell component to get a consistent user experience.

---

## Packages

The library is a monorepo with 5 packages:

| Package | npm Name | Purpose |
|---------|----------|---------|
| **shell** | `@hema/omni-web-app-shell-shell` | Main Shell component (header, footer, providers, consent banner) |
| **core** | `@hema/omni-web-app-shell-core` | Data fetching (header/footer from Sanity), i18n dictionary, search logic |
| **analytics** | `@hema/omni-web-app-shell-analytics` | GTM event tracking, consent gating, `useAnalytics` hook |
| **platform-api** | `@hema/omni-web-app-shell-platform-api` | Platform API client |
| **api-client** | `@hema/omni-web-app-shell-api-client` | Type-safe API clients (Newsletter, Omni-Products) via Kiota |

---

## Installation

### 1. Authenticate with CodeArtifact

```bash
npm run co:login
```

### 2. Add Dependencies

In your `src/package.json`:

```json
{
  "dependencies": {
    "@hema/omni-web-app-shell-shell": "3.0.0",
    "@hema/omni-web-app-shell-core": "3.0.0",
    "@hema/omni-web-app-shell-analytics": "3.0.0",
    "@hema/omni-web-app-shell-platform-api": "^3.0.0",
    "@next/third-parties": "^15.5.18"
  }
}
```

### 3. Peer Dependencies

The shell requires these in your project:

```json
{
  "dependencies": {
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "next": "^15.5.18",
    "@hema/hds-components-react": "^2.1.0-rc.1778855422330",
    "@hema/hds-tailwindcss-presets": "^2.1.0-rc.1778855422330"
  }
}
```

---

## Basic Integration

### Root Layout Setup

Wrap your Next.js app with the Shell in your root layout:

```typescript
// src/app/layout.tsx
import { Shell } from '@hema/omni-web-app-shell-shell';
import { DEFAULT_CONSENT } from '@hema/omni-web-app-shell-analytics';
import type { AnalyticsEnvironment } from '@hema/omni-web-app-shell-analytics';
import {
  getCategoryMenu,
  getFooter,
  getHeader,
  getShellDictionary,
} from '@hema/omni-web-app-shell-core';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = 'nl-nl';
  const environment: AnalyticsEnvironment = 'test';

  // Fetch shell data from Sanity CMS
  const [headerData, footerData, messages, categoryMenuItems] =
    await Promise.all([
      getHeader({ client: sanityClient, locale }),
      getFooter({ client: sanityClient, locale }),
      getShellDictionary(locale),
      getCategoryMenu({ client: sanityClient, locale }),
    ]);

  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="https://cdn.sanity.io" />
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
      </head>
      <body>
        <Shell
          locale={locale}
          messages={messages}
          environment={environment}
          gtmId={process.env.NEXT_PUBLIC_GTM_ID || ''}
          initialConsent={DEFAULT_CONSENT}
          headerData={headerData}
          menuItems={categoryMenuItems}
          footerData={footerData}
          pageType="home"
        >
          <main className="sfcc-layout">{children}</main>
        </Shell>
      </body>
    </html>
  );
}
```

### SFCC Layout Class (Temporary)

While SFCC pages coexist with MFE pages, apply the `sfcc-layout` class to your main content area for consistent page width:

```css
/* src/app/globals.css */
/* TODO(COFI-1183): remove once SFCC pages are gone */
.sfcc-layout {
  @apply hds-max-w-[1280px] hds-mx-auto hds-w-auto;
}

@media only screen and (min-width: 1336px) {
  .sfcc-layout { @apply hds-px-5; }
}
@media only screen and (min-width: 1025px) and (max-width: 1335px) {
  .sfcc-layout { @apply hds-px-12; }
}
@media only screen and (min-width: 768px) and (max-width: 1024px) {
  .sfcc-layout { @apply hds-px-8; }
}
@media only screen and (max-width: 767px) {
  .sfcc-layout { @apply hds-px-4; }
}
```

---

## Shell Props Reference

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Your app content |
| `locale` | `string` | Yes | Locale code (e.g., `'nl-nl'`) |
| `messages` | `Record<string, unknown>` | Yes | i18n dictionary from `getShellDictionary()` |
| `environment` | `'prod' \| 'int' \| 'test'` | Yes | Analytics environment |
| `pageType` | `string` | Yes | Page type for GTM (e.g., `'home'`, `'pdp'`, `'lister'`) |
| `gtmId` | `string` | No | GTM container ID (default: `'GTM-TZKLP7T'`) |
| `initialConsent` | `ConsentState` | No | Initial GDPR consent state |
| `headerData` | `HeaderData` | No | Header data from Sanity |
| `menuItems` | `CategoryMenuItem[]` | No | Category menu items |
| `footerData` | `FooterData` | No | Footer data from Sanity |
| `searchActions` | `SearchActions` | No | Search server actions for header search |
| `isEmbedded` | `boolean` | No | Hide header/footer (for in-app webviews) |
| `appConsent` | `AppConsentQueryParams` | No | App-forwarded consent (suppresses banner) |

---

## Analytics Integration

### Tracking Events

```typescript
'use client';

import { useAnalytics } from '@hema/omni-web-app-shell-analytics';

export function ProductCard({ product }) {
  const { trackEvent } = useAnalytics();

  const handleAddToCart = () => {
    trackEvent({
      event: 'add_to_cart',
      productId: product.id,
      productName: product.name,
      price: product.price,
    });
  };

  return <button onClick={handleAddToCart}>Add to Cart</button>;
}
```

Events are automatically gated by consent — if the user hasn't accepted analytics cookies, events are silently dropped.

### Available Page Types

`'home'`, `'pdp'`, `'lister'`, `'searchresults'`, `'category'`, `'wishlist'`, `'checkout|cart'`, `'checkout|delivery'`, `'checkout|paymentselection'`, `'thankyou'`, `'myhema'`, `'service'`, `'store'`, `'inspiration_landing'`, `'inspiration_hub'`, `'inspiration_blog'`, `'other'`

---

## Search Integration

To enable search in the header, implement server actions:

```typescript
// src/lib/search-actions.ts
'use server';

import { createSearchActions } from '@hema/omni-web-app-shell-core/server';
import type { BusinessCommerceRepository } from '@hema/omni-web-app-shell-core/server';

const repository: BusinessCommerceRepository = {
  // Implement the 6 required methods with your API client
};

const actions = createSearchActions(repository);

export const getInitialSearchInfo = actions.getInitialSearchInfo;
export const getSearchSuggestions = actions.getSearchSuggestions;
```

Then pass to Shell:

```typescript
<Shell searchActions={{ getInitialSearchInfo, getSearchSuggestions }}>
  {children}
</Shell>
```

---

## API Client (Server-Side Only)

The `@hema/omni-web-app-shell-api-client` package provides type-safe clients generated from OpenAPI specs:

```typescript
// Server component or server action only!
import {
  createAdapter,
  createNewsletterClient,
  BearerTokenAuthProvider,
} from '@hema/omni-web-app-shell-api-client';

const adapter = createAdapter({
  baseUrl: process.env.HEMA_NEWSLETTER_BASE_URL,
  authProvider: new BearerTokenAuthProvider(() => Promise.resolve(getAccessToken())),
});

const client = createNewsletterClient(adapter);
const subscriptions = await client.newsletter.v1.newsletters.get({ ... });
```

> **Warning:** Never import `api-client` in client components — it requires server-side credentials.

---

## Shell Component Tree

The Shell renders this provider hierarchy:

1. `ShellProvider` — Shell-specific React context
2. `DataLayerInitializer` — Pushes initial GTM data layer
3. `UsercentricsScript` — Consent banner (suppressed when `appConsent` provided)
4. `GoogleTagManager` — GTM via `@next/third-parties`
5. `I18nProvider` — Internationalization
6. `ShellAnalytics` — Analytics with consent gating
7. `Header` / `Footer` — Rendered when data is provided

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_GTM_ID=GTM-TZKLP7T
```

---

## Requirements

- Node.js >= 22.0.0
- React >= 18.0.0 (19.x recommended)
- Next.js >= 14.0.0 (15.x recommended)
- HDS components (`@hema/hds-components-react`)

---

## Further Reading

- [Shell package README](https://github.com/HemaEcom/omni-web-app-shell-library/blob/main/library/packages/shell/README.md)
- [Core package README](https://github.com/HemaEcom/omni-web-app-shell-library/blob/main/library/packages/core/README.md)
- [Analytics package README](https://github.com/HemaEcom/omni-web-app-shell-library/blob/main/library/packages/analytics/README.md)
- [Example app](https://github.com/HemaEcom/omni-web-app-shell-library/tree/main/library/packages/examples/next/test-analytics)
