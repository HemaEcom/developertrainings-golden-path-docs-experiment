---
title: "Performance — Caching, CDN & Core Web Vitals"
---


> **Sources**: `omni-web-content-frontend/src/next.config.ts`, `omni-web-content-frontend/src/app/`

## Caching Architecture

```
User → CloudFront (CDN) → ALB → ECS (Next.js)
                                      │
                                      ├── Sanity CDN (useCdn: true)
                                      ├── unstable_cache (microcopy, 300s)
                                      └── ISR revalidation (page content, 300s)
```

### Cache Layers

| Layer | What | TTL | Invalidation |
|-------|------|-----|--------------|
| CloudFront | Static assets, pages | Varies by path | Gateway cache policies |
| Next.js ISR | Dynamic pages | 300s (5 min) | Time-based revalidation |
| `unstable_cache` | Microcopy/translations | 300s (5 min) | Tag-based (`microcopy-<locale>`) |
| Sanity CDN | GROQ query results | Automatic | On publish (instant) |
| `generateStaticParams` | Locale routes | Build time | Redeploy |

## ISR (Incremental Static Regeneration)

Content pages use ISR with a 5-minute revalidation window:

```typescript
// src/app/[locale]/[...slugs]/page.tsx
export const revalidate = 300; // 5 minutes
```

Sitemaps use a longer window:
```typescript
// src/app/sitemap-index/route.ts
export const revalidate = 3600; // 1 hour
```

### Static Generation

The home page generates static params for all locales at build time:
```typescript
export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}
```

## Image Optimization

### Sanity CDN Images

All images are served from `cdn.sanity.io` with on-the-fly transformations:

```typescript
// next.config.ts
images: {
  path: imagesPath,
  deviceSizes: [380, 450, 640, 767, 840, 1024, 1240, 1335],
  remotePatterns: [
    { protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/**' },
    { protocol: 'https', hostname: 'www.hema.nl' },
    { protocol: 'https', hostname: 'www.hema.com' },
  ],
}
```

Custom device sizes are tuned to HEMA's breakpoints (not Next.js defaults).

### Image Path Routing

Images are served through the zone's asset prefix path, allowing CloudFront to cache them at the edge:
```typescript
const { imagesPath } = deriveZoneConfig(serviceId);
// e.g., "/_next/image" routed through the content zone
```

## CDN & No-Vary-Search

The `No-Vary-Search` header tells CloudFront that marketing parameters don't affect content:

```
No-Vary-Search: params=("utm_campaign" "utm_content" "utm_medium" "utm_source" ...)
```

This dramatically improves cache hit rates because:
- `/page?utm_source=google` and `/page?utm_source=facebook` serve the same cached response
- Without this, each UTM variant would be a cache miss

## Standalone Output

```typescript
output: 'standalone',
```

The standalone build creates a minimal production bundle:
- Only includes necessary `node_modules`
- Reduces Docker image size
- Faster cold starts on ECS

## Performance Checklist for New MFEs

- [ ] Set `output: 'standalone'` in next.config.ts
- [ ] Configure `revalidate` for ISR (300s recommended for content pages)
- [ ] Use `unstable_cache` for frequently-accessed data (microcopy, config)
- [ ] Configure `deviceSizes` to match your breakpoints
- [ ] Add `No-Vary-Search` header for marketing parameters
- [ ] Use Sanity CDN (`useCdn: true`) for published content
- [ ] Use `generateStaticParams` for known routes (locales, categories)
- [ ] Serve images from `cdn.sanity.io` (no self-hosted images)
- [ ] Use zone-based asset prefix for CDN caching
- [ ] Monitor Core Web Vitals via Sanity request tags and CloudWatch
