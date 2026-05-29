---
title: "Content Flow & Live Preview"
---


> **Sources**: `omni-cms-composable-cms/schemaTypes/lib/presentation/resolve.ts`, `omni-web-content-frontend/src/app/api/draft-mode/`

## Content Delivery Flow

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Editor     │     │  Sanity Content  │     │   MFE (Next.js)     │
│  (Studio)    │────▶│     Lake         │────▶│                     │
│              │     │                  │     │  GROQ → Render      │
└──────────────┘     └──────────────────┘     └─────────────────────┘
                              │
                              │ CDN (useCdn: true)
                              ▼
                     ┌──────────────────┐
                     │   Sanity CDN     │
                     │  (cached reads)  │
                     └──────────────────┘
```

### Published Content (Production)

1. Editor publishes content in Sanity Studio
2. Content is stored in the Content Lake
3. CDN cache is invalidated (automatic)
4. Next.js page revalidates after ISR timeout (300s)
5. User sees updated content

### Draft Content (Preview)

1. Editor opens Presentation Tool in Studio
2. Studio calls MFE's `/api/draft-mode/enable` with a secret
3. MFE validates the secret via `@sanity/preview-url-secret`
4. Draft mode cookie is set
5. `defineLive` switches to real-time listener (no CDN, drafts perspective)
6. Editor sees changes in real-time as they type

## Presentation Tool Configuration

The Presentation Tool is configured in `sanity.config.ts`:

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

### URL Resolution (resolve.ts)

The `resolve` function maps Sanity documents to their frontend URLs:

```typescript
const getRoutes = (doc: Record<string, any> | null) => {
  const country = doc.country.toLowerCase();
  const langs = getCountryLangs(doc?.country); // e.g., ["nl", "fr"] for BE

  for (const lang of langs) {
    const slug = doc[`slug_${lang}`];
    const langPath = `/${lang}-${country}`;

    // Special case: nl-nl is the default locale (no prefix)
    if (langPath === "/nl-nl") {
      href = isRoot ? "" : `/${slug}`;
    } else {
      href = isRoot ? langPath : `${langPath}/${slug}`;
    }

    locations.push({ title, href: `${origin}${href}` });
  }
};
```

This means:
- NL pages: `https://preview.hema.nl/kerst-inspiratie`
- BE Dutch pages: `https://preview.hema.com/nl-be/kerst-inspiratie`
- FR pages: `https://preview.hema.com/fr-fr/noel-inspiration`
- DE pages: `https://preview.hema.com/de-de/weihnachts-inspiration`

### Preview Origins

Two preview origins are configured:
- `SANITY_STUDIO_PREVIEW_ORIGIN_NL` — For .nl domain (Netherlands)
- `SANITY_STUDIO_PREVIEW_ORIGIN_COM` — For .com domain (BE, FR, DE)

## Draft Mode API Routes

### Enable Draft Mode

```
GET /api/draft-mode/enable?sanity-preview-secret=<secret>&sanity-preview-perspective=<perspective>
```

**Flow:**
1. Validates the preview secret using `@sanity/preview-url-secret`
2. Enables Next.js draft mode (`draftMode().enable()`)
3. Optionally sets a perspective cookie (for Sanity Releases)
4. Redirects to the target page

```typescript
// src/app/api/draft-mode/enable/route.ts
export async function GET(req: Request) {
  const secret = url.searchParams.get('sanity-preview-secret');
  const { isValid, redirectTo } = await validatePreviewUrl(clientWithToken, publicUrl);

  if (!isValid) return new NextResponse('Invalid secret', { status: 401 });

  const draft = await draftMode();
  draft.enable();

  // Support Sanity Releases perspective
  const perspective = url.searchParams.get('sanity-preview-perspective');
  if (perspective && await isPreviewPerspectiveValid(perspective)) {
    response.cookies.set('sanity-preview-perspective', perspective, {
      httpOnly: true, secure: true, sameSite: 'strict',
    });
  }

  return NextResponse.redirect(new URL(redirectTo, baseUrl));
}
```

### Disable Draft Mode

```
GET /api/draft-mode/disable
```

Clears the draft mode cookie and redirects back.

## Sanity Releases Support

The draft mode API supports **Sanity Releases** — a feature for scheduling content bundles. When a perspective cookie is set, the MFE fetches content from that specific release perspective instead of just `drafts`.

Validation ensures only active releases are allowed:
```typescript
async function isPreviewPerspectiveValid(perspective: string) {
  const releases = await clientWithToken.fetch("releases::all()[state == 'active']{name}");
  const releaseIds = releases.map(({ name }) => name);
  return perspectiveIds.every(id => id === 'drafts' || releaseIds.includes(id));
}
```

## Visual Editing (Stega)

The client is configured with `stega.studioUrl`, which embeds invisible metadata in rendered strings. When draft mode is active, the Presentation Tool uses this metadata to enable **click-to-edit** — clicking any text in the preview opens the corresponding field in Studio.

## Request Tagging

All Sanity requests are tagged for observability:

```typescript
requestTagPrefix: createRequestTag(requestTagPrefix), // e.g., "omni-web-content"
// Draft requests get: "omni-web-content.draft"
```

This allows monitoring query performance per service in the Sanity dashboard.

## Implementing Draft Mode in a New MFE

1. **Add the API routes:**
   ```
   src/app/api/draft-mode/enable/route.ts
   src/app/api/draft-mode/disable/route.ts
   ```

2. **Configure the Sanity client with `defineLive`:**
   ```typescript
   export const { sanityFetch, SanityLive } = defineLive({
     client: baseClient,
     serverToken: token,
     browserToken: token,
   });
   ```

3. **Use `sanityFetch` in your data layer** — it automatically handles draft/published switching

4. **Register your MFE's preview URL** in the CMS `sanity.config.ts`:
   - Add your origin to `allowOrigins`
   - Add URL resolution rules in `resolve.ts` for your document types

5. **Set environment variables:**
   - `SANITY_API_READ_TOKEN` — Token with read access (for draft content)
   - `NEXT_PUBLIC_SANITY_STUDIO_URL` — Studio URL for stega/visual editing
