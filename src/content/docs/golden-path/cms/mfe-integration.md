---
title: "MFE Integration — Consuming CMS Data in Next.js"
---


> **Source**: `omni-web-content-frontend/src/repositories/sanity/`

## Overview

MFEs consume Sanity CMS data using the **Repository Pattern** with GROQ queries. The integration uses `next-sanity` for client setup and `defineLive` for real-time preview support.

## Setup

### 1. Install Dependencies

```bash
npm install next-sanity @sanity/client @sanity/preview-url-secret
```

### 2. Environment Variables

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

### 3. Client Configuration

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
  stega: {
    studioUrl, // Enables click-to-edit in preview mode
  },
  requestTagPrefix: createRequestTag(requestTagPrefix),
});
```

Key settings:
- `perspective: 'published'` — Only published content in production
- `useCdn: true` — CDN-cached responses for performance
- `stega.studioUrl` — Enables visual editing overlays in preview mode
- `requestTagPrefix` — Tags requests for monitoring/debugging in Sanity dashboard

### 4. Live Preview Client

```typescript
// src/repositories/sanity/preview/live.ts
import { defineLive } from 'next-sanity';

export const { sanityFetch, SanityLive } = defineLive({
  client: baseClient,
  serverToken: token,
  browserToken: token,
});
```

The `sanityFetch` function automatically handles:
- Draft content when draft mode is enabled
- Real-time updates via Sanity's Content Lake listener
- Perspective switching (published, drafts, releases)

## Repository Pattern

Each domain has its own repository class implementing a shared interface:

```typescript
// src/repositories/sanity/page-data-repository.ts
export default class SanityPageDataRepository implements PageRepository {
  private readonly client: RequestClient;

  constructor(requestClient: RequestClient = client) {
    this.client = requestClient;
  }

  async getPageDataBySlug(slug: string, locale: string): Promise<Page | null> {
    const [lang, country] = locale.split('-');
    return await this.client.fetch(PAGE_QUERY, { slug, lang, country });
  }

  async getRootPages(locale: string): Promise<Page[]> { ... }
  async getPageParentBySlug(slug: string, locale: string) { ... }
  async getSeoMetaDataBySlug(slug: string, locale: string) { ... }
  async getAlternatesBySlug(slug: string, locale: string) { ... }
}
```

### Query Parameters Convention

All GROQ queries use these standard parameters:
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
  _type == 'inspirationalCategory' => { ...categoryProjection },
  _type == 'inspirationalLanding' => { ...landingProjection },
}
```

Key patterns:
- **Country filtering**: `($country == '' || lower(country) == $country)` — allows empty country for cross-country queries
- **Translated slug lookup**: `slug[$lang].current == $slug`
- **Type-based projection**: Different projections per `_type`

### Component Resolution (selectComponent)

The flexible component array resolves references:

```groq
selectComponent[$lang][] -> {
  _type,
  // Each component type has its own projection
  _type == 'carousel' => { ...carouselProjection },
  _type == 'heroBlock' => { ...heroProjection },
  ...
}
```

### Microcopy (Translations)

```groq
*[_type == "microcopy"][0] {
  entries[] { title, key, value }
}
```

Fetched with `unstable_cache` and 5-minute revalidation:

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
  "defaultTranslation": defaultTranslation->{ "slug": slug, "country": country },
}
```

## Page Rendering Flow

```
1. Request: GET /nl-nl/inspiratie/kerst
2. Next.js route: src/app/[locale]/[...slugs]/page.tsx
3. PageService.getPageData("inspiratie/kerst", "nl-nl")
4. SanityPageDataRepository.getPageDataBySlug(slug, locale)
5. GROQ query → Sanity Content Lake
6. Returns page data with type + resolved components
7. PageTemplateResolver renders the correct template
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
| Sitemap | Route handler | On-demand |
| Draft mode | No cache | Real-time |

## Adding a New Content Type to Your MFE

1. **Define the GROQ query** in `src/repositories/sanity/queries/`
2. **Create a repository method** in the appropriate repository class
3. **Create a service method** that calls the repository
4. **Create the page/component** that renders the data
5. **Add TypeGen types** — run `npx sanity typegen generate` in the CMS repo to get types

## Environment-Specific Behavior

| Environment | `perspective` | `useCdn` | Draft Mode |
|-------------|--------------|----------|------------|
| Production | `published` | `true` | Available via secret URL |
| Preview | `drafts` | `false` | Enabled |
| Development | `published` | `true` | Available locally |
