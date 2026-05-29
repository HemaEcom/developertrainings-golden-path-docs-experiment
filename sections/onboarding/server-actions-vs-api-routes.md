# Server Actions vs API Routes

> **ADR**: HEM100-ADR-0012
> **Decision**: Use server actions by default, unless the API is meant to be accessed by a different application.

## Rule of Thumb

| Use Case | Use |
|----------|-----|
| Form submissions, mutations from your own UI | **Server Action** |
| Data needed by external systems or other MFEs | **API Route** |
| Health checks, webhooks, draft mode endpoints | **API Route** |
| Adding to cart, newsletter signup, user actions | **Server Action** |

## Why Server Actions by Default?

- No boilerplate (no fetch client, no route handler, no URL management)
- Type-safe end-to-end (TypeScript input → output)
- Works at build time (no need for a running server to call itself)
- No accidental public exposure (server actions are not addressable URLs)
- Progressive enhancement (works without JavaScript)

## When to Use API Routes

- The endpoint is consumed by **another application** (e.g., gateway health check, CMS preview)
- You need an explicit HTTP contract (specific status codes, headers)
- External webhooks need to call your service
- You need to serve non-JSON responses (XML sitemaps, robots.txt)

## Examples in Practice

### Server Actions (PDP)

```typescript
// src/server-actions/add-to-cart.ts
'use server';

export async function addToCart(sku: string, quantity: number) {
  const auth = new KongAuthenticator();
  const headers = await auth.getAuthHeaders();
  // Call commerce API...
}
```

### API Routes (Content Frontend)

```typescript
// src/app/api/health/route.ts — consumed by ALB health checks
export async function GET() {
  return new Response('OK', { status: 200 });
}

// src/app/api/draft-mode/enable/route.ts — consumed by Sanity Studio
export async function GET(req: Request) {
  // Validate secret, enable draft mode...
}

// src/app/sitemap-index/route.ts — consumed by search engines
export async function GET() {
  // Return XML sitemap
}
```

## Security Note

Server actions are **not** publicly addressable URLs, but they are still callable via POST. Always validate inputs and authenticate users where needed — don't assume server actions are "private" just because they lack a URL.
