---
title: "CMS Overview"
sidebar:
  order: 1
---

> **Repo**: [omni-cms-composable-cms](https://github.com/HemaEcom/omni-cms-composable-cms)
> **Sanity version**: 5.x (React 19, Vite-based Studio)
> **API version**: `2026-03-12`
>
> 📐 **ADRs:** [ADR-0009 — Use Sanity directly for editorial content](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6232047668) | [ADR-0002 — Using Sanity CMS for site configuration](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | [ADR-0010 — CMS NOT to consume Bynder directly](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6232604673)

## What Is the CMS?

The **omni-cms-composable-cms** is the headless content management system for HEMA100 micro-frontends. Built on [Sanity.io](https://www.sanity.io/), it manages:

- **Content pages** — Home, Promotions, Flexible Content, Inspiration (landing, categories, articles)
- **Reusable components** — Carousels, Hero Blocks, Banners, Rich Text, Product Arrays, Videos
- **Configuration** — Shell (header/footer), Search Suggestions, Headgroup Config, PDP Recommendation Carousels
- **Microcopy** — Per-service UI translation singletons consumed by MFEs at runtime
- **DAM integration** — Bynder assets synced via Kafka → SQS → Lambda pipeline
- **Live preview** — Presentation tool with draft mode for real-time editing

:::note[Integration Status]
The CMS is actively being integrated with MFEs. The Content MFE (`omni-web-content-frontend`) is the most mature consumer. Other MFEs (PDP, Account) have partial integration for configuration documents.
:::

## Architecture

```d2
direction: down

studio: "Sanity Studio\n(Pages, Components, Config, i18n)" {
  style.fill: "#E8F5E9"
}

content_mfe: "Content MFE\n(GROQ queries + Live Preview)" {
  style.fill: "#E3F2FD"
}

pdp_mfe: "PDP MFE\n(Config + Headgroups)" {
  style.fill: "#E3F2FD"
}

bynder: "Bynder DAM\n(all images & assets)" {
  style.fill: "#FFCCBC"
}

studio -> content_mfe
studio -> pdp_mfe
bynder -> studio: "asset metadata sync\n(Kafka → SQS → Lambda)"
```

### Where things run

| Component | Hosted by | Notes |
|-----------|-----------|-------|
| **Sanity Studio** | Sanity (static SPA on `*.sanity.studio`) | Deployed via `sanity deploy`, served from CDN |
| **Content Lake** (API + data) | Sanity (Google Cloud) | All content data lives here — HEMA doesn't manage the infra |
| **CDN** | Sanity (`*.apicdn.sanity.io`) | Cached read-only queries for production |
| **DAM sync pipeline** | HEMA AWS | Lambda + SQS + Kafka consumer — the only CMS infra HEMA owns |

HEMA controls: projects, datasets, API tokens, CORS origins, and schema. The underlying storage and API infrastructure is fully managed by Sanity.

## Supported Countries & Locales

| Country | ID | Languages | Locales |
|---------|-----|-----------|---------|
| Netherlands | NL | Dutch | nl-nl |
| Belgium | BE | Dutch, French | nl-be, fr-be |
| France | FR | French | fr-fr |
| Germany | DE | German | de-de |

**Fallbacks:** `nl-be` → `nl-nl`, `fr-be` → `fr-fr`

## Key Concepts

### Document Internationalization

Content is NOT duplicated per locale. Each document has a `country` field and uses **translated fields** (e.g., `title.nl`, `title.fr`). The `@sanity/document-internationalization` plugin links country variants together via metadata documents.

### Flexible Page Pattern

Pages use a **flexible component array** — editors compose pages by adding references to reusable component documents (carousels, hero blocks, images, etc.). This is the core content modeling pattern used across all page types.

### Microcopy (UI Translations)

UI strings are stored as singleton documents per MFE service:
- `microcopy` — Legacy shared translations
- `microcopy.omni-web-content` — Content MFE
- `microcopy.omni-web-account` — Account MFE
- `microcopy.omni-web-catalog` — Catalog MFE

### Bynder DAM

All images come from Bynder — direct uploads are disabled. A Kafka pipeline syncs metadata changes (tags, descriptions, archive status) from Bynder back to Sanity.

## Environments

| Stage | Dataset | Studio URL | Trigger |
|-------|---------|------------|---------|
| Production | `production` | `hema-cms.sanity.studio` | Push to `main` |
| Pre-production | `preprod` | `preprod-hema-cms.sanity.studio` | Push to `main` |
| Staging | `staging` | `staging-hema-cms.sanity.studio` | Git tag |
| Sandbox | `<branch>_sandbox` | `<branch>-sandbox-hema-cms.sanity.studio` | Push to `feature/*` |

## Section Guide

| Page | What you'll learn |
|------|------------------|
| [Content Modeling](./content-modeling) | Schema types, page types, reusable components, translated fields |
| [MFE Integration](./mfe-integration) | How frontends consume CMS data (client setup, GROQ, repository pattern) |
| [Content Flow & Live Preview](./content-flow) | End-to-end delivery from editor to screen, draft mode, Presentation Tool |
| [DAM Sync](./dam-sync) | Bynder asset synchronization pipeline |
| [Deployment](./deployment) | CI/CD pipeline, sandbox environments, local deploy |
