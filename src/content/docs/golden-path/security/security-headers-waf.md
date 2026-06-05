---
title: "Security — WAF, Headers & Data Protection"
---


> **Sources**: `omni-web-gateway/lib/runtime/waf-stack.ts`, `omni-web-content-frontend/src/next.config.ts`

## Overview

Security is applied at two layers:
1. **Gateway (CloudFront + WAF)** — Network-level protection, bot control, geo-blocking
2. **MFE (Next.js headers)** — Application-level security headers

MFE teams get WAF protection automatically through the gateway. Security headers are configured per-MFE in `next.config.ts`.

## WAF (Web Application Firewall)

The WAF is deployed in `us-east-1` (required for CloudFront) and attached to the gateway distribution.

### WAF Rules (Priority Order)

| Priority | Rule | Action | Purpose |
|----------|------|--------|---------|
| 0 | Country Block | Block | Blocks traffic from high-risk countries (BR, AR, VN, RU, IN, CN, etc.) |
| 1 | ASN Block | Block | Blocks specific autonomous systems |
| 2 | Country Challenge | Challenge | CAPTCHA for medium-risk countries (ZA, JP, ID, PH, MY, NP) |
| 3 | AWS Common Rule Set | Enforce | OWASP Top 10 protections (XSS, SQLi, etc.) |
| 4 | Known Bad Inputs | Enforce | Blocks known malicious patterns |
| 5 | IP Reputation List | Enforce | Blocks IPs with bad reputation |
| 6 | Bot Control | Count (observe) | Detects and classifies bots |

### Bot Control Exclusions

Verified bots are excluded from blocking to preserve SEO and integrations:
- Search engines (Googlebot, Bingbot)
- SEO crawlers
- Advertising bots
- Content fetchers
- Monitoring (Pingdom, Datadog)
- Social media (link previews)
- Email clients (SafeLinks, prefetch)

### Data Protection in WAF

WAF logs automatically redact sensitive data:
- **Request level**: Authorization headers, cookies (access_token, refresh_token, session IDs)
- **Log level**: IP addresses and email addresses are masked via CloudWatch data protection policy

```typescript
dataProtectionConfig: {
  dataProtections: [
    { action: 'SUBSTITUTION', field: { fieldType: 'SINGLE_HEADER', fieldKeys: ['Authorization', 'Cookie'] } },
    { action: 'SUBSTITUTION', field: { fieldType: 'SINGLE_COOKIE', fieldKeys: ['access_token', 'refresh_token', ...] } },
    { action: 'SUBSTITUTION', field: { fieldType: 'QUERY_STRING' }, excludeRuleMatchDetails: true },
    { action: 'SUBSTITUTION', field: { fieldType: 'BODY' }, excludeRuleMatchDetails: true },
  ],
}
```

### WAF Logging

- **Non-prod**: Logs everything (including Bot Control count-mode matches)
- **Prod**: Drops plain ALLOW actions to reduce volume; keeps BLOCK, COUNT, CHALLENGE

## Security Headers (MFE Level)

Configure in `next.config.ts`:

```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
      { key: 'No-Vary-Search', value: 'params=("utm_campaign" "utm_content" ...)' },
    ],
  }];
}
```

### Header Breakdown

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `Referrer-Policy` | `origin-when-cross-origin` | Limits referrer info to cross-origin |
| `X-DNS-Prefetch-Control` | `on` | Enables DNS prefetching for performance |
| `No-Vary-Search` | UTM params list | Tells CDN that UTM params don't change content |

### No-Vary-Search

The `No-Vary-Search` header is a performance optimization. It tells CloudFront that marketing parameters (UTM, click IDs) don't affect the response content, so the same cached response can serve all URL variants:

```
params=("utm_campaign" "utm_content" "utm_medium" "utm_source" "utm_id" "utm_term" "brid" "fbclid" "gclid" "wbraid" "gbraid" "gclsrc" "gad_campaign" "gad_campaignid" "gad_source" "msclkid" "epik" "pp")
```

## Secrets Management

### MFE Secrets

Stored in AWS Secrets Manager, accessed at runtime:
- `SANITY_API_READ_TOKEN` — Sanity read token (for draft mode)
- `KONG_API_TOKEN_SECRET_ARN` — API gateway credentials (clientId, clientSecret)

Injected into ECS as secrets (not environment variables):
```typescript
ecsSecrets: {
  SANITY_API_READ_TOKEN: ecs.Secret.fromSecretsManager(params.resolved.sanitySecret, 'apiReadToken'),
},
```

### CMS Secrets

Fetched via `scripts/fetch-secrets.sh` and stored in `.env.<stage>` files (gitignored):
- Sanity deploy token
- Sanity dataset token
- CORS token
- Editorial token
- SSO login URL

## Security Checklist for New MFEs

- [ ] Security headers configured in `next.config.ts`
- [ ] HSTS with `includeSubDomains; preload`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] Secrets stored in Secrets Manager (not SSM or env vars)
- [ ] Secrets injected as ECS secrets (not plain environment variables)
- [ ] No sensitive data in client-side code (`NEXT_PUBLIC_*` vars are public)
- [ ] Draft mode protected by `@sanity/preview-url-secret` validation
- [ ] WAF protection via gateway (automatic)
- [ ] `No-Vary-Search` for marketing parameters (CDN cache efficiency)
