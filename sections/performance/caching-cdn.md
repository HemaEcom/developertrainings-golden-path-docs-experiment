# Performance & Caching

> **Sources**: `omni-web-content-frontend/src/next.config.ts`, `omni-web-gateway/lib/common/cloudfront/shared-policies.ts`, `omni-web-content-frontend/src/repositories/sanity/`

## How Caching Works End-to-End

Every request flows through multiple cache layers before reaching the application. Understanding this stack is critical — it determines latency, cost, and content freshness for end users.

```
User Request
    │
    ▼
CloudFront (Edge CDN) ─── Hit → serve cached
    │ Miss
    ▼
ALB → ECS (Next.js)
    │
    ├── ISR Cache (revalidate: 300s, content pages)
    ├── unstable_cache (revalidate: 300s, microcopy/config)
    └── Sanity CDN (useCdn: true, GROQ results)
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

Content pages use ISR to balance freshness with performance:

```typescript
// src/app/[locale]/[...slugs]/page.tsx
export const revalidate = 300; // 5 minutes
```

Sitemaps use a longer window:
```typescript
// src/app/sitemap-index/route.ts
export const revalidate = 3600; // 1 hour
```

### Static Generation at Build Time

The home page pre-generates routes for all supported locales:
```typescript
// src/app/[locale]/page.tsx
export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}
```

> **Note:** The root layout currently sets `export const dynamic = 'force-dynamic'` due to shell data requirements. Tracked as `COFI-621`.

## The `unstable_cache` Pattern

For data shared across many pages (microcopy/translations):

```typescript
// src/repositories/sanity/microcopy-repository.ts
export const fetchMicrocopy = async (locale: string) => {
  return unstable_cache(
    async () => {
      const [lang, country] = locale.split('-');
      const data = await baseClient.fetch(MICROCOPY_QUERY, { lang, country: country.toUpperCase() });
      return transformEntriesToNested(data.entries, lang);
    },
    [`microcopy-${locale}`],
    { revalidate: 300, tags: [`microcopy-${locale}`] },
  )();
};
```

## No-Vary-Search: Boosting Cache Hit Rates

Marketing parameters fragment the CDN cache. The `No-Vary-Search` header prevents this:

```
No-Vary-Search: params=("utm_campaign" "utm_content" "utm_medium" "utm_source" "utm_id" "utm_term" "brid" "fbclid" "gclid" "wbraid" "gbraid" "gclsrc" "gad_campaign" "gad_campaignid" "gad_source" "msclkid" "epik" "pp")
```

**Impact:** `/page?utm_source=google` and `/page?utm_source=facebook` serve the same cached response.

## Image Optimization

### Sanity CDN for All Content Images

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

### Universal Image Loader

Handles all image sources in multi-zone:
- **Sanity assets** → `urlFor().width().auto('format')` (CDN transform)
- **External HTTP** → passthrough
- **Public folder** → serve directly
- **Next.js static** → `/_zones/{serviceId}/_next/image` (zone-aware optimizer)

### Zone-Based Asset Routing

```typescript
// src/utils/zone-config.ts
export function deriveZoneConfig(serviceId: string | undefined | null) {
  const zonePrefix = serviceId ? `/_zones/${serviceId}` : '';
  const imagesPath = zonePrefix ? `${zonePrefix}/_next/image` : undefined;
  return { assetPrefix: zonePrefix, rewrites, imagesPath };
}
```

## Standalone Output & Cold Starts

```typescript
output: 'standalone',
```

Multi-stage Docker build:
```dockerfile
FROM node:22-slim AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p .next/cache
CMD ["node", "server.js"]
```

## Performance Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-DNS-Prefetch-Control` | `on` | Pre-resolve DNS for linked domains |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `origin-when-cross-origin` | Control referrer leakage |
| `No-Vary-Search` | _(marketing params)_ | CDN cache efficiency |

Layout preconnect: `<link rel="preconnect" href="https://htmsa.hema.nl" />`

## Font Loading

`hurmeHema` is loaded via `@hema/hds-assets/next/font`:
- Self-hosted font files (no external requests)
- `font-display: swap` prevents blocking render
- Optimized `@font-face` at build time

## Sanity Client Performance

```typescript
export const baseClient = createClient({
  projectId,
  dataset,
  apiVersion,
  perspective: 'published',
  useCdn: true,
  token,
  requestTagPrefix: createRequestTag(requestTagPrefix),
});
```

**Request tags** allow monitoring GROQ query performance in Sanity's dashboard.

## Performance Checklist for New MFEs

| Item | Why |
|------|-----|
| Set `output: 'standalone'` | Smaller image, faster cold starts |
| Set `revalidate: 300` on content pages | Balance freshness with CDN caching |
| Use `unstable_cache` for shared data | Avoid re-fetching translations per request |
| Configure `deviceSizes` to match breakpoints | Avoid unnecessary image variants |
| Add `No-Vary-Search` for marketing params | Prevent cache fragmentation |
| Use `useCdn: true` for Sanity client | Serve published content from edge |
| Use `generateStaticParams` for known routes | Pre-build locale/category pages |
| Serve images from `cdn.sanity.io` | On-the-fly transforms, no self-hosting |
| Use zone-based asset prefix | Correct routing in multi-zone |
| Add `requestTagPrefix` to Sanity client | Monitor GROQ query performance |
| Add preconnect hints for external origins | Reduce DNS/TLS latency |
