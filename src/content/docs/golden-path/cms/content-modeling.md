---
title: "Content Modeling — Sanity Schema Architecture"
---


> **Source**: `omni-cms-composable-cms/schemaTypes/`

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
├── hooks/                      # Document action hooks
├── fixedFieldsSync/            # Field sync utilities
└── options/                    # Field option lists
```

## Page Types (Documents)

These are the top-level content documents that map to URLs in the frontend.

| Type Name | Enum | Description |
|-----------|------|-------------|
| `homePage` | `PageTypes.HOME_PAGE` | Main home page (one per country) |
| `promotionsPage` | `PageTypes.PROMOTIONS_PAGE` | Promotions landing page |
| `flexibleContentPage` | `PageTypes.FLEXIBLE_CONTENT_PAGE` | Generic content pages with flexible components |
| `inspirationalLanding` | `PageTypes.INSPIRATIONAL_LANDING` | Inspiration hub page |
| `inspirationalCategory` | `PageTypes.INSPIRATIONAL_CATEGORY` | Inspiration category (parent of articles) |
| `inspirationalBlog` | `PageTypes.INSPIRATIONAL_ARTICLE` | Inspiration article (blog post) |

### Flexible Page Template

Most pages use the `createFlexiblePage` template which provides:
- `country` field — which country this page belongs to
- `title` — translated field (per language)
- `slug` — translated field (per language)
- `selectComponent` — **the flexible component array** (references to reusable documents)
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

These are standalone documents that editors create once and reference from multiple pages.

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

| Type Name | Enum | Description |
|-----------|------|-------------|
| `shellConfiguration` | `SHELL_CONFIGURATION` | Header, footer, navigation, social links, awards |
| `searchSuggestionsConfiguration` | `SEARCH_SUGGESTIONS_CONFIGURATION` | Search autocomplete suggestions |
| `headgroupConfiguration` | `HEADGROUP_CONFIGURATION` | PDP headgroup display rules |
| `productLevelConfig` | `PRODUCT_LEVEL_CONFIG` | Product-level display config (singleton) |
| `pdpRecommendationCarousels` | `PDP_RECOMMENDATION_CAROUSELS` | PDP recommendation carousel config |
| `marketingNewsletterConfiguration` | `MARKETING_NEWSLETTER_CONFIGURATION` | Newsletter signup config |
| `categoryTree` | `CATEGORY_TREE` | Category navigation tree (one per country) |

### Shell Configuration

The Shell Configuration document replaces static `header-data.json` and `footer-data.json`. It contains:
- Header top navigation links
- Header main links
- Footer newsletter config
- Footer shop search
- Footer customer service links
- Footer social links
- Footer payment methods
- Footer navigation links
- Footer legal links
- Footer awards
- Footer contact details
- Geo popup exclusions

## Translated Fields Pattern

Fields that need multiple language versions use `createTranslatedField`:

```typescript
// Creates: title.nl, title.fr, title.de
createTranslatedField({
  name: "title",
  title: "Title",
  type: "string",
});

// Creates: slug.nl, slug.fr, slug.de (with slug type)
createTranslatedField({
  name: "slug",
  title: "Slug",
  type: "string",
  customField: { name: "slug", type: "slug", ... },
});
```

In GROQ queries, you access these as `title[$lang]` or `slug[$lang].current`.

## Object Types

Embedded within documents (not standalone):

| Type | Purpose |
|------|---------|
| `link` | Internal/external link with label |
| `imageWithMetadata` | Image reference + DAM metadata |
| `seoMetaData` | SEO fields (title, description, canonical, robots) |
| `openGraph` | OG metadata for social sharing |
| `microcopyEntry` | Legacy translation key-value pair |
| `microcopyLocaleEntry` | Per-locale translation entry |
| `seoLinkEntry` | SEO link with attributes |
| `quickLink` | Quick navigation link with icon |
| `signings` | Product signings/badges |
| `promoCategory` | Promotion category reference |

## Adding a New Schema Type

1. Create the schema file in the appropriate directory:
   - `documents/` for page types
   - `reusableDocuments/` for reusable components
   - `objects/` for embedded objects

2. Register it in `schemaTypes/index.ts`:
   ```typescript
   import { myNewType } from "./reusableDocuments/myNewType";
   export const schemaTypes = [..., myNewType];
   ```

3. If it needs internationalization, add it to `SANITY_CONFIG.TRANSLATION_SCHEMA_TYPES` in `sanityConstants.ts`

4. If it's a reusable component, add it to the Studio structure (desk) in `sanity.config.ts`

5. Run `npm run validate-schema` to verify

6. If the schema change requires data migration, create a migration in `migrations/`
