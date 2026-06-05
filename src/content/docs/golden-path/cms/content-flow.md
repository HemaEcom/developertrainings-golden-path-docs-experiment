---
title: "Content Flow & Live Preview"
sidebar:
  order: 4
---

> **Sources**: `omni-cms-composable-cms/schemaTypes/lib/presentation/resolve.ts`, `omni-web-content-frontend/src/app/api/draft-mode/`

## Published Content (Production)

```d2
direction: down

editor: "Editor publishes in Studio" {
  style.fill: "#E8F5E9"
}

lake: "Sanity Content Lake\n(CDN cache invalidated)" {
  style.fill: "#F3E5F5"
}

mfe: "MFE revalidates\n(ISR timeout: 300s)" {
  style.fill: "#E3F2FD"
}

user: "User sees updated content" {
  style.fill: "#FFF9C4"
}

editor -> lake -> mfe -> user
```

## Draft Content (Live Preview)

```d2
direction: down

editor: "Editor opens Presentation Tool" {
  style.fill: "#E8F5E9"
}

enable: "Studio calls MFE\n/api/draft-mode/enable" {
  style.fill: "#E3F2FD"
}

validate: "MFE validates secret\n(@sanity/preview-url-secret)" {
  style.fill: "#FFF9C4"
}

live: "defineLive switches to\nreal-time listener (no CDN, drafts)" {
  style.fill: "#E3F2FD"
}

realtime: "Editor sees changes\nin real-time as they type" {
  style.fill: "#E8F5E9"
}

editor -> enable -> validate -> live -> realtime
```

## Presentation Tool Configuration

Configured in `sanity.config.ts`:

```typescript
presentationTool({
  resolve: resolve,
  previewUrl: {
    initial: previewOriginNl,
    previewMode: {
      enable: "/api/draft-mode/enable",
      disable: "/api/draft-mode/disable",
    },
  },
  allowOrigins: [previewOriginNl, previewOriginCom].filter(Boolean),
}),
```

### Preview Origins

| Variable | Domain | Countries |
|----------|--------|-----------|
| `SANITY_STUDIO_PREVIEW_ORIGIN_NL` | `.nl` | Netherlands |
| `SANITY_STUDIO_PREVIEW_ORIGIN_COM` | `.com` | Belgium, France, Germany |

### URL Resolution

The `resolve.ts` function maps Sanity documents to frontend URLs:

| Country | Example URL |
|---------|-------------|
| NL | `https://preview.hema.nl/kerst-inspiratie` |
| BE (Dutch) | `https://preview.hema.com/nl-be/kerst-inspiratie` |
| FR | `https://preview.hema.com/fr-fr/noel-inspiration` |
| DE | `https://preview.hema.com/de-de/weihnachts-inspiration` |

`nl-nl` is the default locale (no prefix in the URL path).

## Draft Mode API Routes

### Enable

```
GET /api/draft-mode/enable?sanity-preview-secret=<secret>&sanity-preview-perspective=<perspective>
```

1. Validates the preview secret via `@sanity/preview-url-secret`
2. Enables Next.js `draftMode()`
3. Optionally sets perspective cookie (for Sanity Releases)
4. Redirects to the target page

### Disable

```
GET /api/draft-mode/disable
```

Clears the draft mode cookie and redirects back.

## Sanity Releases Support

Draft mode supports **Sanity Releases** — scheduling content bundles. When a perspective cookie is set, the MFE fetches content from that specific release perspective.

```typescript
async function isPreviewPerspectiveValid(perspective: string) {
  const releases = await clientWithToken.fetch("releases::all()[state == 'active']{name}");
  return perspectiveIds.every(id => id === 'drafts' || releaseIds.includes(id));
}
```

## Visual Editing (Stega)

When draft mode is active, the client embeds invisible metadata in rendered strings. The Presentation Tool uses this to enable **click-to-edit** — clicking text in the preview opens the corresponding field in Studio.

## Request Tagging

All Sanity requests are tagged for observability:

```typescript
requestTagPrefix: "omni-web-content"
// Draft requests get: "omni-web-content.draft"
```

## Implementing Draft Mode in a New MFE

1. Add API routes: `src/app/api/draft-mode/enable/route.ts` and `disable/route.ts`
2. Configure Sanity client with `defineLive`
3. Use `sanityFetch` in your data layer (handles draft/published automatically)
4. Register your MFE's preview URL in the CMS `sanity.config.ts`:
   - Add origin to `allowOrigins`
   - Add URL resolution rules in `resolve.ts`
5. Set env vars: `SANITY_API_READ_TOKEN`, `NEXT_PUBLIC_SANITY_STUDIO_URL`
