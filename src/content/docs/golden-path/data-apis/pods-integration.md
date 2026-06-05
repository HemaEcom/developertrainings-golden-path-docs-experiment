---
title: "PODS Integration — Product Data via GraphQL"
---


> **ADR**: [HEM100-ADR-0008 — Use PODS to get product data](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786)
> **Source**: `omni-web-catalog-pdp/src/services/pods/`, `src/clients/graphql/`

## Overview

**PODS** (Product Omnichannel Data Service) is the GraphQL API that provides product data (pricing, promotions, characteristics, media, fulfillment). Any MFE that renders product information uses PODS.

## Architecture

```
MFE (Next.js RSC)
    │
    │ Apollo Client (server-side only)
    │ Authorization: Bearer <kong-token>
    ▼
Kong API Gateway
    │
    │ Route: /omni-products/v1/graphql
    ▼
PODS GraphQL API
    │
    ▼
Product Data (pricing, stock, media, characteristics)
```

## Setup

### 1. Dependencies

```bash
npm install @apollo/client @apollo/client-integration-nextjs graphql
```

### 2. Store IDs

Each country has a PODS store ID:

| Country | Store ID |
|---------|----------|
| Netherlands (NL) | `0755` |
| Belgium (BE) | `0756` |
| France (FR) | `0759` |
| Germany (DE) | `0751` |

### 3. Apollo Client (Server-Side)

```typescript
// src/clients/graphql/apollo-client-rsc.ts
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

### 4. GraphQL Query

```typescript
// src/services/pods/queries/get-products.ts
import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts($skus: [String!]!, $locale: String!, $storeId: String!) {
    getProducts(skus: $skus, locale: $locale, storeId: $storeId) {
      identifiers { sku }
      properties {
        general {
          name
          description
          pdpUrl
          media { images { name url } }
          hierarchy { headGroup { hierarchyId name } }
          characteristics { signings { key value } }
        }
        fulfillment { deliveryPromise availability }
        sales { price { current original } promotions { label } }
      }
    }
  }
`;
```

### 5. Repository + Service Pattern

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
    const storeId = resolveStoreId(apiLocale); // "nl_NL" → "0755"
    return this.repository.getProducts(skus, apiLocale, storeId);
  }
}
```

### 6. Locale Mapping

PODS uses `language_COUNTRY` format (e.g., `nl_NL`, `fr_BE`):

```typescript
// Convert from routing locale to API locale
// "nl-nl" → "nl_NL", "fr-be" → "fr_BE"
const apiLocale = locale.replace('-', '_').replace(/_.+/, (m) => m.toUpperCase());
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `BASE_API_URL` | Kong API base URL (from SSM: `/hema/global/business-base-url`) |
| `AUTH_SECRET` | Kong credentials JSON (from Secrets Manager: `/hema/global/auth`) |
| `NEXT_PUBLIC_PODS_URL_PATH` | PODS endpoint path (default: `omni-products/v1/graphql`) |

## Error Handling

PODS can return partial data (some products found, others not). The service layer uses a `Result` type:

```typescript
type Result<T> = { kind: 'success'; data: T } | { kind: 'failure'; error: string };
```

## Key Considerations

- **Server-only**: PODS calls happen exclusively in RSC/server actions (never client-side)
- **Authentication**: Uses `KongAuthenticator` (see [Kong Authentication](./kong-authentication.md))
- **Caching**: Apollo's `InMemoryCache` with type policies; Next.js ISR handles page-level caching
- **Load**: ~2 req/sec at peak for content pages with carousels (confirmed insignificant by PODS team)
