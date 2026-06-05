---
title: "Kong API Authentication"
---


> **ADR**: [HEM100-ADR-0015 — Auth with API management](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786)
> **Source**: `omni-web-catalog-pdp/src/services/auth/kong-authenticator.ts`

## Overview

MFEs that call backend services (PODS, Newsletter, Commerce) authenticate via **Kong API Gateway** using OAuth2 client credentials. The token is managed at runtime with proactive refresh — the service token is never loaded directly into the app's public code.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  MFE (ECS)      │────▶│  Kong API    │────▶│  Backend Service │
│                 │     │  Gateway     │     │  (PODS, etc.)    │
│  KongAuth →     │     │              │     │                  │
│  Bearer token   │     │  Validates   │     │                  │
└─────────────────┘     └──────────────┘     └─────────────────┘
         │
         │ Reads AUTH_SECRET from
         │ Secrets Manager (injected as ECS secret)
         ▼
┌─────────────────┐
│  AWS Secrets    │
│  Manager        │
│  /hema/global/  │
│  auth           │
└─────────────────┘
```

## How It Works

1. **Credentials** are stored in Secrets Manager (`/hema/global/auth`) as JSON: `{ clientId, clientSecret, baseUrl }`
2. **ECS injects** the secret as `AUTH_SECRET` environment variable at container start
3. **KongAuthenticator** parses credentials on first use, fetches an OAuth token
4. **Token is cached** in-memory with proactive refresh before expiry
5. **Apollo Client** (or REST client) uses the token as `Authorization: Bearer <token>`

## Implementation

### Authenticator Interface

```typescript
// src/services/auth/authenticator.ts
export interface Authenticator {
  getToken(): Promise<string>;
}
```

### KongAuthenticator (Reference Implementation)

```typescript
// src/services/auth/kong-authenticator.ts
export class KongAuthenticator implements Authenticator {
  private static credentials: KongCredentials | null = null;
  private static tokenCache: TokenData | null = null;
  private static refreshPromise: Promise<TokenData> | null = null;

  async getToken(): Promise<string> {
    // 1. Return cached token if valid and not near expiry
    // 2. If near expiry but still valid → trigger background refresh, return current
    // 3. If expired or missing → block and fetch new token
  }
}
```

Key behaviors:
- **Singleton credentials**: Parsed once from `AUTH_SECRET`, reused for process lifetime
- **Proactive refresh**: Refreshes token before expiry (configurable threshold, default 5 min)
- **Deduplication**: Only one refresh request in-flight at a time
- **Graceful degradation**: If proactive refresh fails, continues using current token until it actually expires

### CDK Setup

```typescript
// lib/runtime/runtime-stack.ts
ecsSecrets: {
  AUTH_SECRET: ecs.Secret.fromSecretsManager(params.resolved.securityCredentials),
},
```

### Usage with Apollo Client

```typescript
// src/clients/graphql/apollo-client-rsc.ts
export function createApolloQueryFn(authenticator: Authenticator) {
  const authLink = setContext(async (_, { headers }) => {
    const token = await authenticator.getToken();
    return {
      headers: { ...headers, authorization: `Bearer ${token}` },
    };
  });

  const { query } = registerApolloClient(() => {
    const httpLink = new HttpLink({ uri: podsEndpoint });
    return new ApolloClient({ link: from([authLink, httpLink]), cache: new InMemoryCache() });
  });

  return query;
}
```

### Usage with REST Client

```typescript
const authenticator = new KongAuthenticator();
const headers = await authenticator.getAuthHeaders();
// Headers: { Authorization: "Bearer <token>", Content-Type: "application/json" }

const response = await fetch(`${BASE_API_URL}/endpoint`, { headers });
```

## Adding Kong Auth to a New MFE

1. **Add the secret to your runtime parameters**:
   ```typescript
   securityCredentials: this.getSecret('SecurityCredentials', `${globalPath}/auth`),
   ```

2. **Inject as ECS secret**:
   ```typescript
   ecsSecrets: {
     AUTH_SECRET: ecs.Secret.fromSecretsManager(params.resolved.securityCredentials),
   }
   ```

3. **Create the authenticator** in your service layer:
   ```typescript
   const authenticator = new KongAuthenticator();
   ```

4. **Use it** in your API clients (Apollo, REST, etc.)

## Security Properties

- Service token never exposed to client-side code (`server-only` import)
- Credentials rotated via Secrets Manager (no app restart needed for secret rotation)
- Token cached in-memory only (not persisted to disk)
- Failed refresh doesn't crash the app (graceful degradation)
