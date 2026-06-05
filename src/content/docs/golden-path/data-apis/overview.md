---
title: "Data & APIs Overview"
sidebar:
  order: 1
---

## How MFEs Access Backend Services

MFEs don't call backend services directly. All API traffic goes through **Kong API Gateway** with OAuth2 authentication. This applies to any service behind Kong: PODS (product data), Newsletter, Commerce, etc.

```d2
direction: down

mfe: "MFE (Next.js)\nServer-side only" {
  style.fill: "#E3F2FD"
}

kong: "Kong API Gateway\n(OAuth2 Bearer token)" {
  style.fill: "#FFF9C4"
}

apis: "" {
  style.stroke: "transparent"
  style.fill: "transparent"

  pods: "PODS\n(Product Data)" {
    style.fill: "#E8F5E9"
  }

  commerce: "Commerce API\n(Cart, Checkout)" {
    style.fill: "#E8F5E9"
  }

  newsletter: "Newsletter API" {
    style.fill: "#E8F5E9"
  }
}

mfe -> kong: "Bearer token"
kong -> apis.pods
kong -> apis.commerce
kong -> apis.newsletter
```

**Key facts:**
- All API calls are **server-side only** (RSC, server actions, API routes) — never from the browser
- Authentication uses OAuth2 client credentials stored in AWS Secrets Manager
- Token management is handled by `KongAuthenticator` (singleton, proactive refresh)

## What Data Comes From Where

| Data | Source | Protocol | Used By |
|------|--------|----------|---------|
| Product info (price, stock, media) | PODS | GraphQL | PDP, Content (carousels) |
| Content pages, components | Sanity CMS | GROQ | Content MFE |
| Shell config (header, footer) | Sanity CMS | GROQ | All MFEs (via Web Shell) |
| Cart, checkout | SFCC Commerce API | REST | Web Shell, Checkout |
| Newsletter signup | Newsletter API | REST | Content, Footer |
| User session | Cookies (same domain) | HTTP | All MFEs |

## Architectural Rule

> **ADR-0008**: Every new MFE that needs product data MUST use PODS, not SFCC Commerce API.

SFCC is being phased out. PODS is the single source of truth for product data.

## Section Guide

| Page | What you'll learn |
|------|------------------|
| [Kong Authentication](./kong-authentication) | OAuth2 setup, KongAuthenticator, secrets injection |
| [PODS Integration](./pods-integration) | Apollo Client, GraphQL queries, store IDs, locale mapping |
| [Session Sharing](./session-sharing) | How auth cookies work during the SFCC → headless transition |
