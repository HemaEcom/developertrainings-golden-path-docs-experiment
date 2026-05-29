---
title: "CMS Overview — Sanity Composable CMS"
---

> **Repo**: `omni-cms-composable-cms`
> **Sanity version**: 5.x (React 19, Vite-based Studio)
> **API version**: `2026-03-12`
> **Studio version**: 1.29.0

## What is the CMS?

The **omni-cms-composable-cms** is the headless content management system for all HEMA100 micro-frontends. It's built on [Sanity.io](https://www.sanity.io/) and provides:

- **Content pages** — Home, Promotions, Flexible Content, Inspiration (landing, categories, articles)
- **Reusable components** — Carousels, Hero Blocks, Banners, Rich Text, Product Arrays, Videos, etc.
- **Configuration documents** — Shell (header/footer), Search Suggestions, Headgroup Config, PDP Recommendation Carousels
- **Microcopy/Translations** — Per-service translation singletons consumed by MFEs at runtime
- **DAM integration** — Bynder assets synced via Kafka → SQS → Lambda pipeline
- **Live preview** — Presentation tool with draft mode for real-time editing in the MFE

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Sanity Studio                             │
│  (Hosted at <host>.sanity.studio, deployed via CDK pipeline)    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│  │  Pages   │   │  Components  │   │  Configuration         │  │
│  │  (6 types)│   │  (22+ types) │   │  (Shell, PDP, Search) │  │
│  └──────────┘   └──────────────┘   └────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Document Internationalization (NL, BE, FR, DE)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Presentation Tool (Live Preview → MFE draft mode)       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ GROQ queries                       │ Draft mode enable/disable
         ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MFE (Next.js)                                  │
│  omni-web-content-frontend / omni-web-catalog-pdp               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  repositories/sanity/                                     │   │
│  │  ├── client.ts          (next-sanity client)             │   │
│  │  ├── queries/           (GROQ queries per domain)        │   │
│  │  ├── preview/live.ts    (defineLive for real-time)       │   │
│  │  └── page-data-repository.ts (Repository pattern)       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         ▲
         │ Kafka → SQS → Lambda
┌─────────────────────────────────────────────────────────────────┐
│                    Bynder DAM                                     │
│  (Asset metadata sync: tags, descriptions, archive status)       │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Countries & Locales

| Country | ID | Languages | Locales |
|---------|-----|-----------|---------|
| Netherlands | NL | Dutch | nl-nl |
| Belgium | BE | Dutch, French | nl-be, fr-be |
| France | FR | French | fr-fr |
| Germany | DE | German | de-de |

Locales with fallbacks:
- `nl-be` falls back to `nl-nl`
- `fr-be` falls back to `fr-fr`

## Key Concepts

### Document Internationalization
Content is NOT duplicated per locale. Instead, each document has a `country` field and uses **translated fields** (e.g., `title.nl`, `title.fr`, `slug.nl`, `slug.fr`). The `@sanity/document-internationalization` plugin manages translation metadata documents that link country variants together.

### Flexible Page Pattern
Pages use a **flexible component array** — editors compose pages by adding references to reusable component documents (carousels, hero blocks, images, etc.). This is the core content modeling pattern.

### Microcopy (Translations)
UI strings are stored as singleton documents per MFE service:
- `microcopy` — Legacy shared translations
- `microcopy.omni-web-content` — Content MFE translations
- `microcopy.omni-web-account` — Account MFE translations
- `microcopy.omni-web-catalog` — Catalog MFE translations

### Bynder DAM Integration
All images come from Bynder (no direct uploads). The Bynder plugin provides the asset picker in Studio. A Kafka-based pipeline syncs metadata changes (tags, descriptions, archive status) from Bynder back to Sanity.

## Deployment Environments

| Stage | Dataset | Studio Host | Branch |
|-------|---------|-------------|--------|
| Production | `production` | `hema-cms.sanity.studio` | `main` |
| Pre-production | `preprod` | `preprod-hema-cms.sanity.studio` | `main` |
| Staging | `staging` | `staging-hema-cms.sanity.studio` | `main` (tag-triggered) |
| Sandbox | `<branch>_sandbox` | `<branch>-sandbox-hema-cms.sanity.studio` | `feature/*`, `fix/*`, `chore/*` |

## Related Documentation

- [Content Modeling](./content-modeling.md) — Schema types, page types, reusable components
- [MFE Integration](./mfe-integration.md) — How frontends consume CMS data
- [Content Flow & Live Preview](./content-flow.md) — End-to-end content delivery
- [DAM Sync](./dam-sync.md) — Bynder asset synchronization pipeline
- [Deployment](./deployment.md) — CI/CD pipeline and sandbox environments
