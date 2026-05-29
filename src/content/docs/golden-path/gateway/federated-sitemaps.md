---
title: "Federated Sitemaps"
---


> **ADR**: Federated Sitemap Architecture
> **Source**: `omni-web-content-frontend/src/app/sitemap-index/`, `omni-web-gateway` (sitemap assembly)

## Overview

The gateway owns `/sitemap.xml` and assembles it from two sources:
1. **Fallback sitemaps** — SFCC child sitemaps (legacy, keyed by type)
2. **Zone sitemaps** — Each MFE contributes its own sitemap for the pages it serves

When a zone registers its sitemap with `replaces: ["key"]`, the matching SFCC fallback is automatically excluded.

## How It Works

```
GET /sitemap.xml → Gateway assembles sitemapindex:
  ├── Fallback entries (SFCC) — unless replaced by a zone
  └── Zone sitemaps (MFEs) — registered per environment
```

## MFE Requirements

If your MFE serves **indexable pages** (not behind login), you must:

1. **Serve sitemap XML** at a route under your zone prefix
2. **Generate from source** — query Sanity/catalog, don't hardcode URLs
3. **Include `lastmod`** from the data source
4. **Include alternates** for multi-locale pages
5. **Register on PROD** via the gateway sitemaps API with `replaces` keys
6. **Cache with TTL** (1 hour recommended)

MFEs behind login (e.g., account) don't need sitemaps.

## Implementation (Content Frontend)

### Sitemap Index

```typescript
// src/app/sitemap-index/route.ts
export const revalidate = 3600; // 1 hour

export async function GET() {
  const pages = await fetchSitemapPages();
  const imageChunks = buildImageSitemapXmls(PUBLIC_URL, pages);

  const sitemapUrls = [
    `${PUBLIC_URL}/sitemaps/sitemap-pages`,
    ...imageChunks.map((_, i) => `${PUBLIC_URL}/sitemaps/sitemap-images-${i + 1}`),
  ];

  const xml = buildIndexSitemapXml(sitemapUrls);
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

### Page Sitemap

```typescript
// src/app/sitemaps/sitemap-pages/route.ts
export const revalidate = 3600;

export async function GET() {
  const pages = await fetchSitemapPages(); // GROQ query for all published pages
  const xml = buildPageSitemapXml(PUBLIC_URL, pages);
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

### Data Source (GROQ)

```groq
*[_type in ["inspirationalBlog", "inspirationalCategory", "inspirationalLanding", "flexibleContentPage", "homePage"]] {
  "slug": slug,
  "country": country,
  "lastmod": _updatedAt,
}
```

## Zone Replacement Keys

| Zone | Replaces Key | What It Takes Over |
|------|-------------|-------------------|
| `content` | `folders` | Inspiration, homepage, content pages |
| `pdp` | `products` | Product detail pages |
| `customer-service` | — | New pages (no SFCC equivalent) |
| `myaccount` | — | Not indexable (behind login) |

## Migration Sequence

1. Gateway takes over `/sitemap.xml` — registers SFCC sitemaps as fallback
2. Content MFE goes live → registers with `replaces: ["folders"]`
3. PDP MFE goes live → registers with `replaces: ["products"]`
4. SFCC sunset → all fallback keys replaced, admin clears fallback list
