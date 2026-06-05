---
title: "MFE Integration"
sidebar:
  order: 3
---

> **Source**: `omni-web-content-frontend/src/repositories/sanity/`
>
> 📐 **ADR:** [ADR-0009 — Use Sanity directly for editorial content](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6232047668) — Decision: MFEs query Sanity directly via GROQ (no BFF layer for content).

:::note[Current State]
The Content MFE (`omni-web-content-frontend`) has the most complete Sanity integration. The patterns described here are extracted from that implementation and serve as the reference for other MFEs.
:::

## Setup

### Dependencies

```bash
npm install next-sanity @sanity/client @sanity/preview-url-secret
```

### Environment Variables

```env
# Required
NEXT_PUBLIC_SANITY_PROJECT_ID=<project-id>
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-01-15
NEXT_PUBLIC_SANITY_STUDIO_URL=https://hema-cms.sanity.studio
NEXT_PUBLIC_BASE_URL=https://www.hema.nl
NEXT_PUBLIC_REQUEST_TAG_PREFIX=omni-web-content

# Server-only (for draft mode)
SANITY_API_READ_TOKEN=<read-token>
```

### Client Configuration

```typescript
// src/repositories/sanity/client.ts
import { createClient } from 'next-sanity';

export const baseClient = createClient({
  projectId,
  dataset,
  apiVersion,
  perspective: 'published',
  token,
  useCdn: true,
  stega: { studioUrl },
  requestTagPrefix: createRequestTag(requestTagPrefix),
});
```

| Setting | Value | Why |
|---------|-------|-----|
| `perspective` | `'published'` | Only published content in production |
| `useCdn` | `true` | CDN-cached responses for performance |
| `stega.studioUrl` | Studio URL | Enables click-to-edit in preview mode |
| `requestTagPrefix` | Service name | Tags requests for monitoring in Sanity dashboard |

### Live Preview Client

```typescript
// src/repositories/sanity/preview/live.ts
import { defineLive } from 'next-sanity';

export const { sanityFetch, SanityLive } = defineLive({
  client: baseClient,
  serverToken: token,
  browserToken: token,
});
```

`sanityFetch` automatically handles draft content when draft mode is enabled, real-time updates via Content Lake listener, and perspective switching.

## Repository Pattern

Each domain has a repository class:

```typescript
// src/repositories/sanity/page-data-repository.ts
export default class SanityPageDataRepository implements PageRepository {
  async getPageDataBySlug(slug: string, locale: string): Promise<Page | null> {
    const [lang, country] = locale.split('-');
    return await this.client.fetch(PAGE_QUERY, { slug, lang, country });
  }
}
```

### Query Parameters Convention

All GROQ queries use:
- `$lang` — Language code (`nl`, `fr`, `de`)
- `$country` — Country code lowercase (`nl`, `be`, `fr`, `de`)
- `$slug` — Page slug

```typescript
const [lang, country] = locale.split('-'); // "nl-nl" → ["nl", "nl"]
```

## GROQ Query Patterns

### Page Query (Multi-type Resolution)

```groq
*[($country == '' || lower(country) == $country) &&
  defined(slug[$lang].current) && slug[$lang].current == $slug][0]
{
  _type == 'homePage' => { ...homePageProjection },
  _type == 'flexibleContentPage' => { ...flexibleProjection },
  _type == 'inspirationalBlog' => { ...blogProjection },
}
```

- **Country filtering**: `($country == '' || lower(country) == $country)`
- **Translated slug lookup**: `slug[$lang].current == $slug`
- **Type-based projection**: Different shapes per `_type`

### Component Resolution (selectComponent)

```groq
selectComponent[$lang][] -> {
  _type,
  _type == 'carousel' => { ...carouselProjection },
  _type == 'heroBlock' => { ...heroProjection },
}
```

### Microcopy (UI Translations)

```typescript
export const fetchMicrocopy = async (locale: string) => {
  return unstable_cache(
    async () => {
      const data = await baseClient.fetch(MICROCOPY_QUERY, { lang, country });
      return transformEntriesToNested(data.entries, lang);
    },
    [`microcopy-${locale}`],
    { revalidate: 300, tags: [`microcopy-${locale}`] },
  )();
};
```

### Alternates (hreflang)

```groq
*[_type == "translation.metadata" &&
  *[slug[$lang].current == $slug][0]._id in translations[].value._ref
][0] {
  "translations": translations[]{ "_key": _key, "slug": value->slug },
}
```

## Page Rendering Flow

```d2
direction: down

request: "GET /nl-nl/inspiratie/kerst" {
  style.fill: "#FFF9C4"
}

route: "Next.js route\n[locale]/[...slugs]/page.tsx" {
  style.fill: "#E3F2FD"
}

repo: "SanityPageDataRepository\n→ GROQ query" {
  style.fill: "#E8F5E9"
}

sanity: "Sanity Content Lake" {
  style.fill: "#F3E5F5"
}

render: "PageTemplateResolver\n→ renders correct template" {
  style.fill: "#E3F2FD"
}

request -> route -> repo -> sanity
sanity -> render: "page data + components"
```

```typescript
// src/app/[locale]/[...slugs]/page.tsx
export default async function Page({ params }) {
  const { slugs, locale } = await params;
  const path = slugs.join('/');
  const pageType = (await pageService.getPageData(path, locale))?.type;
  if (!pageType) notFound();
  return <PageTemplateResolver pageType={pageType} path={path} locale={locale} />;
}
```

## Caching Strategy

| Data Type | Cache | Revalidation |
|-----------|-------|--------------|
| Page content | Next.js ISR | 300s (5 min) |
| Microcopy | `unstable_cache` | 300s (5 min) |
| Sitemap | Route handler | 3600s (1 hour) |
| Draft mode | No cache | Real-time |

## Environment Behavior

| Environment | `perspective` | `useCdn` | Draft Mode |
|-------------|--------------|----------|------------|
| Production | `published` | `true` | Via secret URL |
| Preview | `drafts` | `false` | Enabled |
| Development | `published` | `true` | Available locally |
