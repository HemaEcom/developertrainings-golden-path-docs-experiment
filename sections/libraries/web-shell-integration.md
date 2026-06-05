---
title: "Web Shell Integration"
---

> **Repo:** [omni-web-app-shell-library](https://github.com/HemaEcom/omni-web-app-shell-library)
> **Version:** 3.0.0

## What Is the Web Shell?

The Web Shell wraps every MFE with a consistent HEMA experience: header, footer, navigation, analytics (GTM + consent), and search. It's a monorepo of 5 packages.

## Packages

| Package | Purpose |
|---------|---------|
| `@hema/omni-web-app-shell-shell` | Main Shell component (header, footer, consent banner, providers) |
| `@hema/omni-web-app-shell-core` | Data fetching for shell content from Sanity CMS, i18n dictionary |
| `@hema/omni-web-app-shell-analytics` | GTM event tracking with consent gating |
| `@hema/omni-web-app-shell-platform-api` | Platform API client |
| `@hema/omni-web-app-shell-api-client` | Type-safe API clients (Newsletter, Products) via Kiota |

## Quick Setup

```bash
npm install @hema/omni-web-app-shell-shell @hema/omni-web-app-shell-core @hema/omni-web-app-shell-analytics
```

## Integration Pattern

The Shell wraps your app in a layout file. It fetches header/footer data from Sanity CMS using the same client your content uses:

```tsx
import { getCategoryMenu, getFooter, getHeader, getShellDictionary } from '@hema/omni-web-app-shell-core';
import { Shell } from '@hema/omni-web-app-shell-shell';
import { DEFAULT_CONSENT } from '@hema/omni-web-app-shell-analytics';
import { baseClient } from '@/repositories/sanity/client';

export default async function ShellLayout({ children }) {
  const locale = await getLocale();

  const [footerData, headerData, menuItems, messages] = await Promise.all([
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
      menuItems={menuItems}
      messages={messages}
      environment={process.env.ENVIRONMENT || 'test'}
      initialConsent={DEFAULT_CONSENT}
      pageType="content"
    >
      {children}
    </Shell>
  );
}
```

## Key Concepts

- **Shell placement** — Can be in root layout or a [route group](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/05-capabilities#10-route-groups-for-layout-variants) layout (for pages that need no shell, like embedded editors)
- **Analytics** — Events are consent-gated automatically. Use `useAnalytics()` hook in client components
- **`isEmbedded`** — Set to `true` to hide header/footer (for in-app webviews)
- **Search** — Pass `searchActions` prop to enable header search (requires server action implementation)
- **`pageType`** — Identifies the page for GTM (e.g., `'home'`, `'pdp'`, `'content'`)

## Analytics Usage

```tsx
'use client';
import { useAnalytics } from '@hema/omni-web-app-shell-analytics';

export function ProductCard({ product }) {
  const { trackEvent } = useAnalytics();
  return <button onClick={() => trackEvent({ event: 'add_to_cart', productId: product.id })}>Add</button>;
}
```

## Further Reading

- [Shell README](https://github.com/HemaEcom/omni-web-app-shell-library/blob/main/library/packages/shell/README.md)
- [Core README](https://github.com/HemaEcom/omni-web-app-shell-library/blob/main/library/packages/core/README.md)
- [Analytics README](https://github.com/HemaEcom/omni-web-app-shell-library/blob/main/library/packages/analytics/README.md)
- [Example app](https://github.com/HemaEcom/omni-web-app-shell-library/tree/main/library/packages/examples/next/test-analytics)
