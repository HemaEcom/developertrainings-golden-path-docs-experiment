---
title: "Session Sharing"
sidebar:
  order: 4
---

> 📐 **ADR:** [ADR-0004 — Session sharing between SFCC and Next.js](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6000803842) (In Progress)

:::note[Transition Pattern]
This describes how sessions work during the SFCC → headless migration. As SFCC is phased out, authentication will move to a dedicated identity service. The Web Shell abstracts this so MFE teams won't need code changes.
:::

## Why This Exists

Users navigate between SFCC pages and Next.js MFEs **on the same domain**. Session state must be seamless — logged in on SFCC means logged in on Next.js pages.

## How It Works

```d2
direction: down

gateway: "CloudFront Gateway\n(same domain: hema.nl)" {
  style.fill: "#FFF9C4"
}

sfcc: "SFCC Pages\n(sets auth cookies)" {
  style.fill: "#FFCCBC"
}

mfe: "Next.js MFE\n(reads auth cookies)" {
  style.fill: "#E3F2FD"
}

cookies: "Shared cookies\n(.hema.nl / .hema.com)" {
  style.fill: "#E8F5E9"
}

gateway -> sfcc
gateway -> mfe
sfcc -> cookies: "sets"
mfe -> cookies: "reads"
```

Because SFCC and MFEs are served from the same domain (via the CloudFront gateway), cookies set by SFCC are readable by Next.js and vice versa.

## What's Shared

| State | Where It Lives | How MFEs Access |
|-------|---------------|-----------------|
| Authentication | Cookies on `.hema.nl` / `.hema.com` | Read server-side (RSC) or via Web Shell |
| Cart context | SFCC Commerce API | Web Shell `api-client` package |
| User identity | Session cookie | Validated per request |

## What MFE Developers Need to Know

1. **Don't implement your own auth** — Use the Web Shell's session handling (`@hema/omni-web-app-shell-core`)
2. **Cart operations go through Commerce API** — Use `@hema/omni-web-app-shell-api-client`
3. **Cookies are httpOnly + secure** — Can't read auth cookies from client JS; use server-side
4. **Cookies flow through the gateway** — CloudFront passes them to your origin during SSR
5. **Shell header handles UI state** — Cart count, user name, login/logout are all managed by Web Shell

## Security

- All auth cookies: `httpOnly`, `secure`, `sameSite`
- Tokens validated on each request (not just trusted from cookie)
- No sensitive data in client-accessible cookies
