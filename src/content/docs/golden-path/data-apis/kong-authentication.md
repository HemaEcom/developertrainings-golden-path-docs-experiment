---
title: "Kong Authentication"
sidebar:
  order: 2
---

> **Source**: `omni-web-catalog-pdp/src/services/auth/kong-authenticator.ts`
>
> 📐 **ADR:** [ADR-0015 — Auth with API management](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) — Decision: service credentials stored and rotated independently, never loaded directly into the app.

## How It Works

```d2
direction: down

secrets: "AWS Secrets Manager\n/hema/global/auth" {
  style.fill: "#FFF9C4"
}

ecs: "ECS Task\n(injects AUTH_SECRET env var)" {
  style.fill: "#E3F2FD"
}

auth: "KongAuthenticator\n(in-memory token cache)" {
  style.fill: "#E8F5E9"
}

kong: "Kong API Gateway\n(validates Bearer token)" {
  style.fill: "#FFF9C4"
}

backend: "Backend Service\n(PODS, Newsletter, etc.)" {
  style.fill: "#F3E5F5"
}

secrets -> ecs: "credentials JSON"
ecs -> auth: "AUTH_SECRET"
auth -> kong: "Authorization: Bearer <token>"
kong -> backend: "authenticated request"
```

## Flow

1. Credentials stored in Secrets Manager as JSON: `{ clientId, clientSecret, baseUrl }`
2. ECS injects the secret as `AUTH_SECRET` environment variable at container start
3. `KongAuthenticator` parses credentials on first use, fetches an OAuth token
4. Token is cached in-memory with proactive refresh before expiry
5. Apollo Client (or REST) uses the token as `Authorization: Bearer <token>`

## Implementation

### Authenticator Interface

```typescript
export interface Authenticator {
  getToken(): Promise<string>;
}
```

### KongAuthenticator

```typescript
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

**Behaviors:**
- Singleton credentials — parsed once, reused for process lifetime
- Proactive refresh — refreshes before expiry (default 5 min threshold)
- Deduplication — only one refresh request in-flight at a time
- Graceful degradation — if refresh fails, continues with current token until it expires

### Usage with Apollo Client

```typescript
export function createApolloQueryFn(authenticator: Authenticator) {
  const authLink = setContext(async (_, { headers }) => {
    const token = await authenticator.getToken();
    return { headers: { ...headers, authorization: `Bearer ${token}` } };
  });

  const { query } = registerApolloClient(() => {
    const httpLink = new HttpLink({ uri: podsEndpoint });
    return new ApolloClient({ link: from([authLink, httpLink]), cache: new InMemoryCache() });
  });
  return query;
}
```

### Usage with REST

```typescript
const authenticator = new KongAuthenticator();
const token = await authenticator.getToken();
const response = await fetch(`${BASE_API_URL}/endpoint`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

## Adding Kong Auth to a New MFE

1. **Add the secret to runtime parameters:**
   ```typescript
   securityCredentials: this.getSecret('SecurityCredentials', `${globalPath}/auth`),
   ```

2. **Inject as ECS secret:**
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
- Credentials rotated via Secrets Manager (no app restart needed)
- Token cached in-memory only (not persisted to disk)
- Failed refresh doesn't crash the app (graceful degradation)
