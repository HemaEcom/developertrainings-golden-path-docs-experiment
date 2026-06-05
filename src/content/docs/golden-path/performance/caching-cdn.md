---
title: "Performance & Caching"
sidebar:
  order: 1
---

## How Caching Works End-to-End

> **Sources:**
> - [RFC: omni-web-gateway CloudFront Routing Gateway](https://hemaecom.atlassian.net/wiki/pages/viewpage.action?pageId=6062735368) — defines the cache strategy during SFCC→MFE migration (Decision 1: origin-controlled TTL, `X-Origin-Version` in cache key, cache poisoning prevention)
> - [ADR-0013: Use CloudFront Functions for Gateway Router](https://hemaecom.atlassian.net/wiki/x/ADR-0013) — decides on cache policy configuration (1-day default TTL respecting origin `Cache-Control`, cookies in cache key, Gzip+Brotli)
> - [`omni-web-gateway/lib/common/cloudfront/shared-policies.ts`](https://github.com/HemaEcom/omni-web-gateway/blob/main/lib/common/cloudfront/shared-policies.ts) — implements the cache policy in CDK
> - [`omni-web-content-frontend/src/next.config.ts`](https://github.com/HemaEcom/omni-web-content-frontend/blob/main/src/next.config.ts) — MFE-side configuration (ISR, headers, images)
> - [`omni-web-content-frontend/src/repositories/sanity/`](https://github.com/HemaEcom/omni-web-content-frontend/tree/main/src/repositories/sanity) — Sanity CDN usage and `unstable_cache` pattern

Every request flows through multiple cache layers before reaching the application. Understanding this stack is critical — it determines latency, cost, and content freshness for end users.

```d2
direction: down

user: "User Request" {
  style.fill: "#E3F2FD"
}

cf: "CloudFront (Edge CDN)\nGzip + Brotli compression\nOrigin-controlled TTL" {
  style.fill: "#FFF9C4"
}

alb: "ALB → ECS (Next.js)" {
  style.fill: "#E8F5E9"
}

caches: "" {
  style.stroke: "transparent"
  style.fill: "transparent"

  isr: "ISR Cache\nrevalidate: 300s\n(content pages)" {
    style.fill: "#F3E5F5"
  }

  unstable: "unstable_cache\nrevalidate: 300s\n(microcopy, config)" {
    style.fill: "#F3E5F5"
  }

  sanity: "Sanity CDN\nuseCdn: true\n(GROQ results)" {
    style.fill: "#F3E5F5"
  }
}

user -> cf: "Hit → serve cached"
cf -> alb: "Miss → origin"
alb -> caches.isr
alb -> caches.unstable
alb -> caches.sanity
```

**Key facts:**
- CloudFront cache TTL is **origin-controlled** (default 0s, max 365 days) — the MFE sets `Cache-Control` headers
- ISR pages revalidate every 5 minutes — a stale response is served while a fresh one is generated in the background
- The `No-Vary-Search` header prevents marketing parameters from fragmenting the cache
- Sanity CDN invalidates instantly on publish, but ISR adds a 5-minute delay before the MFE picks up changes

## Cache Layers at a Glance

| Layer | What it Caches | TTL | Invalidation |
|-------|---------------|-----|--------------|
| **CloudFront** | All responses (origin-controlled) | 0s default, up to 365d | Origin `Cache-Control` header |
| **Next.js ISR** | Content pages (`[...slugs]`) | 300s (5 min) | Time-based revalidation |
| **`unstable_cache`** | Microcopy translations | 300s (5 min) | Tag-based (`microcopy-<locale>`) |
| **Sanity CDN** | GROQ query results | Automatic | Instant on content publish |
| **Static Params** | Home page locale routes | Build time | Redeploy |

## CloudFront Cache Policy

The gateway uses an **origin-controlled cache policy** — meaning the CDN respects whatever `Cache-Control` header the origin (Next.js) sends:

```typescript
// From omni-web-gateway/lib/common/cloudfront/shared-policies.ts
new CachePolicy(this, 'OriginControlledCachePolicy', {
  defaultTtl: Duration.seconds(0),    // Don't cache unless origin says to
  minTtl: Duration.seconds(0),
  maxTtl: Duration.days(365),         // Respect long TTLs for static assets
  cookieBehavior: CacheCookieBehavior.none(),
  queryStringBehavior: CacheQueryStringBehavior.all(),
  enableAcceptEncodingGzip: true,
  enableAcceptEncodingBrotli: true,
});
```

**What this means for MFE developers:**
- If you don't set `Cache-Control` headers, CloudFront won't cache your responses
- Static assets (`_next/static/*`) get long TTLs automatically from Next.js
- ISR pages get `s-maxage=300, stale-while-revalidate` from the ISR mechanism
- API routes default to no caching unless you explicitly set headers

## ISR (Incremental Static Regeneration)

Content pages use ISR to balance freshness with performance. A page is served from cache and revalidated in the background after the TTL expires:

```typescript
// src/app/[locale]/[...slugs]/page.tsx
export const revalidate = 300; // 5 minutes
```

Sitemaps use a longer revalidation window since they change infrequently:

```typescript
// src/app/sitemap-index/route.ts
export const revalidate = 3600; // 1 hour
```

### Static Generation at Build Time

The home page pre-generates routes for all supported locales at build time — these are instantly available without a cold-start penalty:

```typescript
// src/app/[locale]/page.tsx
export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}
```

:::note[Layout uses force-dynamic]
The root layout currently sets `export const dynamic = 'force-dynamic'` due to shell data requirements (header, footer, category menu are fetched per request). This is tracked as `COFI-621` for improvement. Despite this, ISR still works at the page level for `[...slugs]` routes.
:::

## The `unstable_cache` Pattern

For data that is shared across many pages (microcopy/translations), use `unstable_cache` with tag-based invalidation:

```typescript
// src/repositories/sanity/microcopy-repository.ts
export const fetchMicrocopy = async (locale: string) => {
  return unstable_cache(
    async () => {
      const [lang, country] = locale.split('-');
      const data = await baseClient.fetch(MICROCOPY_QUERY, {
        lang,
        country: country.toUpperCase(),
      });
      return transformEntriesToNested(data.entries, lang);
    },
    [`microcopy-${locale}`],           // Cache key
    { revalidate: 300, tags: [`microcopy-${locale}`] },  // 5 min + tag
  )();
};
```

**When to use this pattern:**
- Data shared across many pages (translations, site config, navigation)
- Data that changes infrequently (every few hours, not every request)
- Data that benefits from a deterministic cache key

## No-Vary-Search: Boosting Cache Hit Rates

Marketing parameters (`utm_source`, `gclid`, `fbclid`, etc.) are appended to URLs by advertising platforms. Without intervention, each parameter combination creates a separate cache entry — destroying hit rates.

The `No-Vary-Search` header tells CloudFront these parameters don't affect content:

```typescript
// src/next.config.ts — headers() function
{
  key: 'No-Vary-Search',
  value: 'params=("utm_campaign" "utm_content" "utm_medium" '
    + '"utm_source" "utm_id" "utm_term" "brid" "fbclid" '
    + '"gclid" "wbraid" "gbraid" "gclsrc" "gad_campaign" '
    + '"gad_campaignid" "gad_source" "msclkid" "epik" "pp")',
}
```

**Impact:** `/page?utm_source=google` and `/page?utm_source=facebook` now serve the same cached response — a single cache entry instead of thousands.

## Image Optimization

### Sanity CDN for All Content Images

All content images are served from `cdn.sanity.io` with on-the-fly transformations (resize, crop, format). No images are self-hosted:

```typescript
// src/next.config.ts
images: {
  path: imagesPath,
  deviceSizes: [380, 450, 640, 767, 840, 1024, 1240, 1335],
  remotePatterns: [
    { protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/**' },
    { protocol: 'https', hostname: 'acc.hema.nl' },
    { protocol: 'https', hostname: 'acc.hema.com' },
    { protocol: 'https', hostname: 'staging.hema.nl' },
    { protocol: 'https', hostname: 'staging.hema.com' },
    { protocol: 'https', hostname: 'www.hema.nl' },
    { protocol: 'https', hostname: 'www.hema.com' },
  ],
}
```

The `deviceSizes` are tuned to HEMA's design breakpoints, not Next.js defaults (640, 750, 828, 1080, 1200, 1920, 2048, 3840).

### Universal Image Loader

The `universalImageLoader` handles all image sources in a multi-zone environment:

```d2
direction: down

image: "Image source" {
  style.fill: "#E3F2FD"
}

loader: "universalImageLoader" {
  style.fill: "#FFF9C4"
}

routes: "" {
  style.stroke: "transparent"
  style.fill: "transparent"

  sanity: "Sanity asset\n→ urlFor().width().auto('format')" {
    style.fill: "#E8F5E9"
  }

  external: "External HTTP\n→ passthrough" {
    style.fill: "#E8F5E9"
  }

  local: "Public folder\n→ serve directly" {
    style.fill: "#E8F5E9"
  }

  next: "Next.js static\n→ /_zones/{id}/_next/image" {
    style.fill: "#E8F5E9"
  }
}

image -> loader
loader -> routes.sanity
loader -> routes.external
loader -> routes.local
loader -> routes.next
```

Key behavior: in multi-zone mode, the image optimizer path is prefixed with the zone (`/_zones/{serviceId}/_next/image`) so CloudFront routes the request to the correct MFE.

### Zone-Based Asset Routing

Each MFE in the multi-zone setup has its own asset prefix. This ensures CloudFront caches static assets per-zone:

```typescript
// src/utils/zone-config.ts
export function deriveZoneConfig(serviceId: string | undefined | null) {
  const zonePrefix = serviceId ? `/_zones/${serviceId}` : '';
  const imagesPath = zonePrefix ? `${zonePrefix}/_next/image` : undefined;

  const rewrites = zonePrefix ? async () => ({
    beforeFiles: [
      { source: `${zonePrefix}/_next/image`, destination: '/_next/image' },
    ],
    afterFiles: [
      { source: '/images/:path*', destination: `${zonePrefix}/images/:path*` },
    ],
    fallback: [],
  }) : undefined;

  return { assetPrefix: zonePrefix, rewrites, imagesPath };
}
```

## Standalone Output & Cold Starts

The standalone build mode creates a minimal production bundle for fast container startup:

```typescript
// src/next.config.ts
output: 'standalone',
```

**What it does:**
- Traces dependencies and copies only required `node_modules` files
- Final image: `node server.js` + `.next/static` + `public/` (no dev deps, no source)
- Multi-stage Docker build separates build from runtime

```dockerfile
# Runtime stage — minimal image
FROM node:22-slim AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p .next/cache
CMD ["node", "server.js"]
```

## Performance Headers

All pages include these security + performance headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-DNS-Prefetch-Control` | `on` | Pre-resolve DNS for linked domains |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `origin-when-cross-origin` | Control referrer leakage |
| `No-Vary-Search` | _(marketing params)_ | CDN cache efficiency |

The layout also includes a preconnect hint for the Google Tag Manager domain:

```html
<link rel="preconnect" href="https://htmsa.hema.nl" />
```

## Font Loading

The HEMA brand font (`hurmeHema`) is loaded via `@hema/hds-assets/next/font` which uses Next.js's built-in font optimization:
- Self-hosts the font files (no external requests)
- Applies `font-display: swap` to prevent blocking render
- Generates optimized `@font-face` declarations at build time

## Sanity Client Performance

The Sanity client is configured for maximum CDN usage in production:

```typescript
// src/repositories/sanity/client.ts
export const baseClient = createClient({
  projectId,
  dataset,
  apiVersion,
  perspective: 'published',
  useCdn: true,       // ← Serve from Sanity's global CDN
  token,
  requestTagPrefix: createRequestTag(requestTagPrefix),
});
```

**Request tags** (`requestTagPrefix`) allow monitoring query performance in Sanity's dashboard — you can see which queries are slow, frequently called, or returning large payloads.

## Performance Checklist for New MFEs

| Item | Why |
|------|-----|
| Set `output: 'standalone'` | Smaller image, faster cold starts |
| Set `revalidate: 300` on content pages | Balance freshness with CDN caching |
| Use `unstable_cache` for shared data | Avoid re-fetching translations per request |
| Configure `deviceSizes` to match breakpoints | Avoid generating unnecessary image variants |
| Add `No-Vary-Search` for marketing params | Prevent cache fragmentation from UTMs |
| Use `useCdn: true` for Sanity client | Serve published content from edge |
| Use `generateStaticParams` for known routes | Pre-build locale/category pages |
| Serve images from `cdn.sanity.io` | On-the-fly transforms, no self-hosting |
| Use zone-based asset prefix | Correct routing in multi-zone |
| Add `requestTagPrefix` to Sanity client | Monitor GROQ query performance |
| Add preconnect hints for external origins | Reduce DNS/TLS latency |
