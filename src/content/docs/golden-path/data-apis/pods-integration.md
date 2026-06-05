---
title: "PODS Integration"
sidebar:
  order: 3
---

> **Source**: `omni-web-catalog-pdp/src/services/pods/`
>
> 📐 **ADR:** [ADR-0008 — Use PODS to get product data](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6223953921)

## What Is PODS?

**PODS** (Product Omnichannel Data Service) is the GraphQL API for product data. It provides pricing, promotions, stock, media, characteristics, and fulfillment info. Any MFE that renders product information uses PODS.

## Architecture

```d2
direction: down

mfe: "MFE (Server Component)\nApollo Client" {
  style.fill: "#E3F2FD"
}

kong: "Kong API Gateway" {
  style.fill: "#FFF9C4"
}

pods: "PODS GraphQL\n/omni-products/v1/graphql" {
  style.fill: "#E8F5E9"
}

mfe -> kong: "Bearer token"
kong -> pods: "authenticated"
```

## Setup

### Dependencies

```bash
npm install @apollo/client @apollo/client-integration-nextjs graphql
```

### Store IDs

Each country has a PODS store ID:

| Country | Store ID |
|---------|----------|
| Netherlands (NL) | `0755` |
| Belgium (BE) | `0756` |
| France (FR) | `0759` |
| Germany (DE) | `0751` |

### Apollo Client (Server-Side)

```typescript
import { registerApolloClient, ApolloClient, InMemoryCache } from '@apollo/client-integration-nextjs';
import { HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

export function createApolloQueryFn(authenticator: Authenticator) {
  const authLink = setContext(async (_, { headers }) => {
    const token = await authenticator.getToken();
    return { headers: { ...headers, authorization: `Bearer ${token}` } };
  });

  const { query } = registerApolloClient(() => {
    const httpLink = new HttpLink({ uri: `${process.env.BASE_API_URL}/omni-products/v1/graphql` });
    return new ApolloClient({ link: from([authLink, httpLink]), cache: new InMemoryCache() });
  });
  return query;
}
```

`registerApolloClient` ensures one client instance per request in RSC.

## Query Example

```typescript
import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts($skus: [String!]!, $locale: String!, $storeId: String!) {
    getProducts(skus: $skus, locale: $locale, storeId: $storeId) {
      identifiers { sku }
      properties {
        general { name description pdpUrl media { images { name url } } }
        sales { price { current original } promotions { label } }
        fulfillment { deliveryPromise availability }
      }
    }
  }
`;
```

## Repository + Service Pattern

```typescript
// Repository (data access)
export class PodsRepositoryImpl implements PodsRepository {
  constructor(private readonly client: GraphQLClient) {}

  async getProducts(skus: string[], apiLocale: string, storeId: string) {
    return this.client.query(GET_PRODUCTS, { skus, locale: apiLocale, storeId });
  }
}

// Service (business logic)
export class PodsService {
  constructor(private readonly repository: PodsRepository) {}

  async getProducts(skus: string[], apiLocale: ApiLocale) {
    const storeId = resolveStoreId(apiLocale);
    return this.repository.getProducts(skus, apiLocale, storeId);
  }
}
```

## Locale Mapping

PODS uses `language_COUNTRY` format:

```typescript
// "nl-nl" → "nl_NL", "fr-be" → "fr_BE"
const apiLocale = locale.replace('-', '_').replace(/_.+/, (m) => m.toUpperCase());
```

## What PODS Provides

| Data | Description |
|------|-------------|
| Identifiers | SKU, article number |
| General | Name, description, PDP URL, product type |
| Media | Images (from Bynder via PIM) |
| Hierarchy | Category, headgroup, merchandise category |
| Characteristics | Signings, material, dimensions, care instructions |
| Sales | Current price, original price, promotions |
| Fulfillment | Delivery promise, availability, stock |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `BASE_API_URL` | Kong API base URL |
| `AUTH_SECRET` | Kong credentials JSON (see [Kong Authentication](./kong-authentication)) |

## Key Rules

- **Server-only** — PODS calls happen exclusively in RSC/server actions (never client-side)
- **Always use Kong** — Never call PODS directly, always through Kong with Bearer token
- **Error handling** — PODS can return partial data; use a Result type pattern
- **Caching** — Apollo's `InMemoryCache` per request; Next.js ISR handles page-level caching
