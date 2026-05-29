---
title: "Session Sharing — SFCC & Next.js Coexistence"
---


> **ADR**: HEM100-ADR-0004 (In Progress)
> **Status**: Active during the SFCC → headless transition

## Why This Matters

HEMA is migrating from SFCC to Next.js MFEs over a multi-year period. During this transition, users navigate between SFCC pages and Next.js pages **on the same domain** (hema.nl / hema.com). Session state must be seamless — a user who logs in on SFCC must appear logged in on Next.js pages, and vice versa.

## What's Shared

| State | Where It Lives | How MFEs Access It |
|-------|---------------|-------------------|
| Authentication (logged in/out) | Cookies on `.hema.nl` / `.hema.com` | Read cookies server-side (SSR) or via Web Shell |
| Cart context | SFCC Commerce API | Web Shell `api-client` package |
| User identity | Session cookie | Validated per request |

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  SFCC Pages  │     │  CloudFront  │     │  Next.js MFE │
│              │◄───▶│  (Gateway)   │◄───▶│              │
│  Sets auth   │     │  Same domain │     │  Reads auth  │
│  cookies     │     │  cookies     │     │  cookies     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                          │
       │         Shared cookies on domain         │
       └──────────────────────────────────────────┘
```

Key mechanism: **Same-domain cookies**. Because SFCC and Next.js MFEs are served from the same domain (via CloudFront gateway), cookies set by SFCC are readable by Next.js and vice versa.

## What MFE Developers Need to Know

1. **Don't implement your own auth** — Use the Web Shell's session handling. The `@hema/omni-web-app-shell-core` package provides user context.

2. **Cart operations go through Commerce API** — Use `@hema/omni-web-app-shell-api-client` for cart add/remove/count. Don't call SFCC directly.

3. **Cookies are httpOnly + secure** — You cannot read auth cookies from client-side JavaScript. Use server-side (RSC or API routes) to check auth state.

4. **Session cookies flow through the gateway** — CloudFront passes cookies to your origin. Your MFE receives them in the request headers during SSR.

5. **The Shell header handles UI state** — Cart count, user name, login/logout links are all managed by the Web Shell header component. You don't need to implement these.

## Security Requirements

- All auth cookies use `httpOnly`, `secure`, `sameSite` attributes
- Tokens are validated on each request (not just trusted from cookie)
- Tokens have expiry and refresh mechanisms
- No sensitive data exposed in client-accessible cookies

## Future Direction

As SFCC is phased out, authentication will move to a dedicated identity service. The cookie-based session sharing is a **transition pattern** — it works because everything is on the same domain. The Web Shell abstracts this so MFE teams won't need to change their code when the auth backend changes.
