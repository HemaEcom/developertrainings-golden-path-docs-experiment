# Data APIs — Overview

## Product Data: Moving to PODS

**PODS** (Product Omnichannel Data Service) is HEMA's unified product data API. It's the **single source of truth** for product information across all channels (web, app, in-store).

### Why PODS?

HEMA is moving away from SFCC's Commerce API for product data. PODS provides:

- **Unified product data** — One API for all channels, not per-storefront
- **Real-time pricing & promotions** — Always current, no stale cache
- **Rich product model** — Characteristics, signings, media, fulfillment, hierarchy
- **GraphQL** — Fetch exactly what you need, no over-fetching
- **Country-aware** — Store IDs per region (NL, BE, FR, DE)

### What PODS Provides

| Data | Description |
|------|-------------|
| Product identifiers | SKU, article number |
| General info | Name, description, PDP URL, product type |
| Media | Images (from Bynder via PIM) |
| Hierarchy | Category, division, headgroup, merchandise category |
| Characteristics | Signings, material, dimensions, care instructions |
| Sales | Current price, original price, promotions |
| Fulfillment | Delivery promise, availability, stock |

### Who Uses PODS?

| MFE | What It Fetches |
|-----|----------------|
| Catalog/PDP | Full product data for product detail pages |
| Content | Product carousels on inspiration/home pages |
| Checkout (future) | Cart product details, pricing validation |
| Search/Discovery (future) | Product cards in search results |

### Direction of Travel

```
Today:  SFCC Commerce API ←── some MFEs still use this for cart/checkout
        PODS GraphQL      ←── all product display data

Future: SFCC Commerce API ←── only legacy (being phased out)
        PODS GraphQL      ←── ALL product data across all MFEs
```

Every new MFE that needs product data **MUST use PODS**, not SFCC Commerce API. This is a decided architectural direction (ADR-0008).

### Integration Pattern

PODS is accessed **server-side only** via Kong API Gateway with OAuth2 authentication:

```
MFE (RSC) → Kong (Bearer token) → PODS GraphQL
```

For implementation details, see:
- [PODS Integration Guide](./pods-integration.md) — Apollo Client setup, queries, store IDs
- [Kong Authentication](./kong-authentication.md) — OAuth2 client credentials flow
