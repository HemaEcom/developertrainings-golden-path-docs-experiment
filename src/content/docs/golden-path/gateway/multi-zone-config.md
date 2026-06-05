---
title: "Multi-Zone Next.js Configuration"
sidebar:
  order: 2
---


> Reference: [omni-web-catalog-pdp/src/next.config.ts](https://github.com/HemaEcom/omni-web-catalog-pdp/blob/main/src/next.config.ts)
>
> 📐 **Architecture Decisions:** [ADR-0016 — Multi-zone support](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | [ADR-0017 — URL namespace structure](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786)

---

Once your MFE is [registered with the gateway](./gateway-registration), you need to configure Next.js to work correctly within the multi-zone architecture. This page covers the `next.config.ts` settings that make your assets, images, and routes work alongside other MFEs on the same domain.

## What Is Multi-Zone?

In HEMA's architecture, multiple Next.js applications (MFEs) are served through a single domain (hema.nl / hema.com) via the gateway. Each MFE owns a "zone" — a set of URL paths it handles.

The challenge: when multiple apps share a domain, their static assets (`/_next/static/...`) and image optimization endpoints (`/_next/image`) would collide. Multi-zone configuration solves this by namespacing each MFE's assets under a unique prefix.

```
hema.nl/_zones/omni-web-content/_next/static/...   → content MFE assets
hema.nl/_zones/omni-web-catalog-pdp/_next/static/... → PDP MFE assets
hema.nl/_next/image?url=...                         → default image optimizer
```

---

## The `deriveZoneConfig` Utility

Every MFE uses a shared utility to derive its zone configuration from a service ID:

```typescript
// src/utils/zone-config.ts
import type { Rewrite } from 'next/dist/lib/load-custom-routes';

export function deriveZoneConfig(serviceId: string | undefined | null) {
  const zonePrefix = serviceId ? `/_zones/${serviceId}` : '';

  const imagesPath = zonePrefix ? `${zonePrefix}/_next/image` : undefined;

  const rewrites = zonePrefix
    ? async () => ({
        beforeFiles: [
          {
            source: `${zonePrefix}/_next/image`,
            destination: '/_next/image',
          } satisfies Rewrite,
        ],
        afterFiles: [
          {
            source: '/images/:path*',
            destination: `${zonePrefix}/images/:path*`,
          } satisfies Rewrite,
        ],
        fallback: [] as Rewrite[],
      })
    : undefined;

  return {
    assetPrefix: zonePrefix,
    rewrites,
    imagesPath,
  };
}
```

### What it produces

| Field | Value (for `omni-web-content`) | Purpose |
|-------|------|---------|
| `assetPrefix` | `/_zones/omni-web-content` | Prefixes all `/_next/static/` URLs |
| `imagesPath` | `/_zones/omni-web-content/_next/image` | Custom image optimization endpoint path |
| `rewrites.beforeFiles` | `/_zones/omni-web-content/_next/image` → `/_next/image` | Internally routes zone-prefixed image requests to the actual optimizer |
| `rewrites.afterFiles` | `/images/:path*` → `/_zones/omni-web-content/images/:path*` | Rewrites image paths to include zone prefix |

---

## next.config.ts Setup

```typescript
// src/next.config.ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { deriveZoneConfig } from './utils/zone-config';

const serviceId = process.env.NEXT_PUBLIC_SERVICE_ID || 'omni-web-content';
const { assetPrefix, rewrites, imagesPath } = deriveZoneConfig(serviceId);

const nextConfig: NextConfig = {
  output: 'standalone',  // Required for Docker/ECS deployment
  assetPrefix,           // Zone-specific asset prefix
  rewrites,              // Zone-aware URL rewrites

  images: {
    path: imagesPath,    // Zone-specific image optimization path
    deviceSizes: [380, 450, 640, 767, 840, 1024, 1240, 1335],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/**' },
      { protocol: 'https', hostname: 'www.hema.nl' },
      { protocol: 'https', hostname: 'www.hema.com' },
      // ... other allowed image hosts
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'No-Vary-Search',
            value: 'params=("utm_campaign" "utm_content" "utm_medium" "utm_source" "utm_id" "utm_term" "brid" "fbclid" "gclid" "wbraid" "gbraid" "gclsrc" "gad_campaign" "gad_campaignid" "gad_source" "msclkid" "epik" "pp")',
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```

---

## How Zones Are Identified

Each MFE has a **service ID** that determines its zone prefix:

| Service | Service ID | Zone Prefix |
|---------|-----------|-------------|
| Content/Inspiration | `omni-web-content` | `/_zones/omni-web-content` |
| Product Detail Page | `omni-web-catalog-pdp` | `/_zones/omni-web-catalog-pdp` |

The service ID is set via the `NEXT_PUBLIC_SERVICE_ID` environment variable, which is injected by the CDK runtime stack from SSM Parameter Store.

---

## Security Headers

All MFEs should include these security headers (configured in `next.config.ts`):

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `Referrer-Policy` | `origin-when-cross-origin` | Limit referrer info on cross-origin requests |
| `X-DNS-Prefetch-Control` | `on` | Enable DNS prefetching |
| `No-Vary-Search` | `params=(...)` | Tell CDN that marketing query params don't affect content (improves cache hit rate) |

The `No-Vary-Search` header is particularly important — it tells the gateway's CloudFront distribution that UTM parameters, click IDs, and other tracking params don't change the page content, allowing better caching.

---

## Connection to Gateway Registration

The zone prefix in `next.config.ts` **must match** the `_zones/` route registered in `gateway-routes-config.json`:

```json
// gateway-routes-config.json
{
  "routes": [
    {
      "name": "zones-prefix",
      "type": "prefix",
      "enabled": true,
      "route": "_zones/omni-web-content"  // ← Must match assetPrefix
    }
  ]
}
```

```typescript
// next.config.ts
const { assetPrefix } = deriveZoneConfig('omni-web-content');
// assetPrefix = "/_zones/omni-web-content"  ← Same prefix
```

If these don't match, your static assets won't be served correctly.

---

## Local Development

During local development (`npm run dev`), the zone config still works but isn't strictly necessary since you're the only app on `localhost:3000`. The `deriveZoneConfig` function gracefully handles missing/empty service IDs by returning empty defaults.

---

## Further Reading

- **← Previous:** [Gateway Registration](./gateway-registration) — How routes are registered with the gateway
- **Next →** [Federated Sitemaps](./federated-sitemaps) — How MFEs contribute SEO sitemaps
- [Docker/Standalone Build](../infrastructure/docker-standalone) — Why `output: 'standalone'` is required
