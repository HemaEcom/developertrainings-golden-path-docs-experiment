---
title: "Content Modeling"
sidebar:
  order: 2
---

> **Source**: `omni-cms-composable-cms/schemaTypes/`
>
> 📐 **ADR:** [ADR-0002 — Using Sanity CMS for site configuration](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) — Decision: Shell config (header, footer, navigation) lives in Sanity, not in static JSON files.

## Schema Organization

```
schemaTypes/
├── index.ts                    # All registered types
├── sanityConstants.ts          # Enums, config, supported countries
├── documents/                  # Page types & configuration documents
├── reusableDocuments/          # Reusable component documents
├── objects/                    # Object types (embedded in documents)
├── fields/                     # Shared field definitions
├── helpers/                    # Schema helpers (localized fields, reference fields)
├── validations/                # Custom validation rules
├── components/                 # Custom Studio UI components
└── hooks/                      # Document action hooks
```

## Page Types (Documents)

Top-level content documents that map to frontend URLs.

| Type Name | Enum | Description |
|-----------|------|-------------|
| `homePage` | `PageTypes.HOME_PAGE` | Home page (one per country) |
| `promotionsPage` | `PageTypes.PROMOTIONS_PAGE` | Promotions landing page |
| `flexibleContentPage` | `PageTypes.FLEXIBLE_CONTENT_PAGE` | Generic content pages with flexible components |
| `inspirationalLanding` | `PageTypes.INSPIRATIONAL_LANDING` | Inspiration hub page |
| `inspirationalCategory` | `PageTypes.INSPIRATIONAL_CATEGORY` | Inspiration category (parent of articles) |
| `inspirationalBlog` | `PageTypes.INSPIRATIONAL_ARTICLE` | Inspiration article (blog post) |

### Flexible Page Template

Most pages use `createFlexiblePage` which provides:
- `country` — which country this page belongs to
- `title` — translated field (per language)
- `slug` — translated field (per language)
- `selectComponent` — the flexible component array (references to reusable documents)
- `seoMetaData` — SEO metadata (title, description, canonical, robots)
- `openGraph` — Open Graph metadata

```typescript
// Example: flexibleContentPage.ts
export const flexibleContentPage = createFlexiblePage({
  name: PageTypes.FLEXIBLE_CONTENT_PAGE,
  title: "Flexible Content Page",
  flexibleComponents: [
    defineArrayMember(createReferenceField({ name: "carousel", types: [ReusableDocumentTypes.CAROUSEL] })),
    defineArrayMember(createReferenceField({ name: "heroBlock", types: [ReusableDocumentTypes.HERO_BLOCK] })),
    defineArrayMember(createReferenceField({ name: "richText", types: [ReusableDocumentTypes.RICH_TEXT] })),
    // ... more component types
  ],
});
```

## Reusable Component Documents

Standalone documents that editors create once and reference from multiple pages.

| Type Name | Enum | Description |
|-----------|------|-------------|
| `carousel` | `CAROUSEL` | Product/content carousel |
| `categoryCarousel` | `CATEGORY_CAROUSEL` | Category navigation carousel |
| `heroBlock` | `HERO_BLOCK` | Full-width hero banner with image/video |
| `bannerArray` | `BANNER_ARRAY` | Array of banner cards |
| `bannerCard` | `BANNER_CARD` | Single banner card |
| `photo` | `IMAGE` | Image with metadata |
| `embeddedImage` | `EMBEDDED_IMAGE` | Embedded image block |
| `embeddedVideo` | `EMBEDDED_VIDEO` | Embedded video block |
| `video` | `VIDEO` | Video component |
| `richText` | `RICH_TEXT` | Rich text block (Portable Text) |
| `tableElement` | `TABLE` | Table component |
| `imageContentBlock` | `IMAGE_CONTENT_BLOCK` | Image + text layout |
| `callToActionBlock` | `CALL_TO_ACTION_BLOCK` | CTA block |
| `button` | `BUTTON` | Button component |
| `infoInline` | `INFO_INLINE` | Inline info message |
| `featuredArticle` | `FEATURED_INSPIRATIONAL_ARTICLE` | Featured article highlight |
| `productArray` | `PRODUCT_ARRAY` | Product grid (connects to PODS) |
| `voucherArray` | `VOUCHER_ARRAY` | Voucher display |
| `structuredData` | `STRUCTURED_DATA` | JSON-LD structured data |
| `questionary` | `QUESTIONARY` | Quiz/questionnaire |
| `seoLinksBlock` | `SEO_LINKS_BLOCK` | SEO internal links |
| `retailMediaBanner` | `RETAIL_MEDIA_BANNER` | Retail media ad placement |
| `globalMessageBanner` | `GLOBAL_MESSAGE_BANNER` | Site-wide message banner |

## Configuration Documents

One document per country, managing MFE behavior.

| Type Name | Description |
|-----------|-------------|
| `shellConfiguration` | Header, footer, navigation, social links, awards |
| `searchSuggestionsConfiguration` | Search autocomplete suggestions |
| `headgroupConfiguration` | PDP headgroup display rules |
| `productLevelConfig` | Product-level display config (singleton) |
| `pdpRecommendationCarousels` | PDP recommendation carousel config |
| `marketingNewsletterConfiguration` | Newsletter signup config |
| `categoryTree` | Category navigation tree (one per country) |

### Shell Configuration

Contains everything for the Web Shell: header top navigation, main links, footer newsletter, customer service links, social links, payment methods, legal links, awards, contact details, and geo popup exclusions.

## Translated Fields

Fields needing multiple language versions use `createTranslatedField`:

```typescript
// Creates: title.nl, title.fr, title.de
createTranslatedField({
  name: "title",
  title: "Title",
  type: "string",
});
```

In GROQ queries, access as `title[$lang]` or `slug[$lang].current`.

## Object Types (Embedded)

| Type | Purpose |
|------|---------|
| `link` | Internal/external link with label |
| `imageWithMetadata` | Image reference + DAM metadata |
| `seoMetaData` | SEO fields (title, description, canonical, robots) |
| `openGraph` | OG metadata for social sharing |
| `microcopyEntry` | Translation key-value pair |

## Adding a New Schema Type

1. Create the file in the appropriate directory (`documents/`, `reusableDocuments/`, or `objects/`)
2. Register in `schemaTypes/index.ts`
3. If it needs internationalization, add to `SANITY_CONFIG.TRANSLATION_SCHEMA_TYPES` in `sanityConstants.ts`
4. If reusable component, add to Studio desk structure in `sanity.config.ts`
5. Run `npm run validate-schema`
6. If data migration needed, create one in `migrations/`
