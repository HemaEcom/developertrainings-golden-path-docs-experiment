---
title: "Gateway Registration Guide"
---


> Reference repos:
> - [omni-web-gateway](https://github.com/HemaEcom/omni-web-gateway) — The gateway infrastructure
> - [omni-web-gateway-api](https://github.com/HemaEcom/omni-web-gateway-api) — The management API
> - [omni-web-catalog-pdp](https://github.com/HemaEcom/omni-web-catalog-pdp) — Example MFE with gateway registration
>
> 📐 **Architecture Decision:** [ADR-0013 — Use CloudFront Functions for gateway router](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786)

---

## What Is the Gateway?

The **Omni Web Gateway** is a CloudFront distribution that serves as the single entry point for all HEMA web traffic. It routes requests to the correct micro-frontend (MFE) based on URL path patterns.

```d2
direction: right

user: User {
  shape: person
}

gateway: CloudFront Gateway {
  shape: cloud
  routing: Routing Function {
    shape: hexagon
  }
  kvs: Key-Value Store {
    shape: cylinder
  }
}

mfe: MFE Origin {
  shape: rectangle
  style.fill: "#E8F5E9"
  label: "MFE Origin\n(ECS via VPC Origin)"
}

sfcc: SFCC {
  shape: rectangle
  style.fill: "#FFEBEE"
  style.stroke-dash: 3
  label: "SFCC\n(default fallback)"
}

user -> gateway: HTTPS
gateway.routing -> gateway.kvs: lookup path
gateway.routing -> mfe: "match found"
gateway.routing -> sfcc: "no match" {
  style.stroke-dash: 3
}
```

Each MFE **registers its routes** with the gateway during CDK deployment. The gateway's CloudFront Function reads these routes from a Key-Value Store (KVS) and directs traffic accordingly.

**Without gateway registration, your MFE will never receive traffic.**

---

## How It Works (High Level)

```d2
direction: down

mfe_account: Your MFE AWS Account {
  style.fill: "#E3F2FD"

  ecs: ECS Service {
    shape: rectangle
  }
  alb: ALB {
    shape: rectangle
  }
  vpc_origin: VPC Origin {
    shape: hexagon
  }
  ram: RAM Resource Share {
    shape: diamond
  }
  registration: GatewayRegistration {
    shape: rectangle
    style.fill: "#C8E6C9"
    label: "GatewayRegistration\n(CDK Construct)"
  }

  ecs -> alb: health checks
  alb -> vpc_origin: private link
  vpc_origin -> ram: shares access
}

gateway_account: Gateway AWS Account {
  style.fill: "#FFF3E0"

  api: Gateway Management API {
    shape: rectangle
  }
  kvs: CloudFront KVS {
    shape: cylinder
  }
  cf: CloudFront Distribution {
    shape: cloud
  }
  routing_fn: Routing Function {
    shape: hexagon
  }

  api -> kvs: "updates routes"
  cf -> routing_fn: "evaluates request"
}

mfe_account.ram -> gateway_account.cf: "cross-account\nVPC Origin access"
mfe_account.registration -> gateway_account.api: "registers routes\n+ VPC Origin"
gateway_account.routing_fn -> mfe_account.vpc_origin: "routes traffic"
```

**The flow:**

1. Your runtime stack deploys an **ECS service** behind an **ALB** with a **VPC Origin**
2. The VPC Origin is shared with the gateway account via **RAM Resource Share**
3. Your stack calls the **GatewayRegistration** construct, which:
   - Registers your routes (paths) with the gateway management API
   - Associates your VPC Origin as the target for those routes
   - Creates preview URLs for testing
4. The gateway management API updates the CloudFront KVS with your route entries
5. The CloudFront routing function starts directing matching traffic to your origin

---

## Route Configuration

Routes are defined in `lib/runtime/gateway-routes-config.json`:

```json
{
  "domains": [
    {
      "gatewayDomain": "nl",
      "locales": ["nl-nl"]
    },
    {
      "gatewayDomain": "com",
      "localePrefix": "always",
      "locales": ["nl-be", "fr-be", "fr-fr", "de-de"]
    }
  ],
  "routes": [
    {
      "name": "zones-prefix",
      "type": "prefix",
      "enabled": true,
      "route": "_zones/omni-web-content"
    },
    {
      "name": "inspiration-pages",
      "type": "prefix",
      "enabled": true,
      "localized": {
        "nl-nl": "inspiratie",
        "nl-be": "inspiratie",
        "fr-be": "inspiration",
        "fr-fr": "inspiration",
        "de-de": "inspiration"
      }
    },
    {
      "name": "home-page",
      "type": "exact",
      "enabled": true,
      "localized": {
        "nl-nl": "/",
        "nl-be": "/",
        "fr-be": "/",
        "fr-fr": "/",
        "de-de": "/"
      }
    }
  ],
  "rolloutPercentage": 100
}
```

### Configuration Fields

| Field | Description |
|-------|-------------|
| `domains` | Which gateway domains this MFE serves (nl = hema.nl, com = hema.com) |
| `domains[].gatewayDomain` | Domain identifier (`nl` or `com`) |
| `domains[].localePrefix` | Set to `"always"` for .com domain where locale is part of the URL path |
| `domains[].locales` | Which locales this domain serves |
| `routes` | Array of route definitions |
| `routes[].name` | Unique identifier for the route (used in rollout groups) |
| `routes[].type` | Match type: `prefix`, `exact`, or `regex` |
| `routes[].enabled` | Whether the route is active |
| `routes[].route` | Single path for all locales (e.g., `_zones/omni-web-content`) |
| `routes[].localized` | Per-locale paths (e.g., `inspiratie` for NL, `inspiration` for FR) |
| `rolloutPercentage` | Default percentage of traffic routed to this MFE (0-100) |

### Route Match Types

| Type | Behavior | Example |
|------|----------|---------|
| `prefix` | Matches the path and all sub-paths | `inspiratie` matches `/inspiratie`, `/inspiratie/kerst`, etc. |
| `exact` | Matches only the exact path | `/` matches only the root, not `/something` |
| `regex` | Matches a regex pattern | `^nl-be/mijn-hema.*` |

### Locale Handling

- **hema.nl** (`gatewayDomain: "nl"`): No locale prefix in URLs. `/inspiratie` serves `nl-nl`.
- **hema.com** (`gatewayDomain: "com"`, `localePrefix: "always"`): Locale is prepended. `nl-be/inspiratie` serves `nl-be`.

---

## CDK Integration

### Required Packages

```json
{
  "dependencies": {
    "@hema/omni-web-gateway-management-library-constructs": "2.7.0",
    "@hema/omni-web-gateway-management-library-types": "2.7.0",
    "@hema/omni-web-gateway-management-library-utils": "2.7.0"
  }
}
```

### Using GatewayRegistration in Your Runtime Stack

```typescript
import { GatewayRegistration } from '@hema/omni-web-gateway-management-library-constructs/gateway-registration';
import { OriginType } from '@hema/omni-web-gateway-management-library-types';
import { buildGatewayZones, GatewayRoutesConfig } from '@hema/omni-web-gateway-management-library-utils';
import { readFileSync } from 'fs';
import { join } from 'path';

// 1. Define your origin (the ALB behind VPC Origin)
const origin = {
  originType: OriginType.VPC,
  domain: NextJsEcs.alb.loadBalancer.loadBalancerDnsName,
  vpcOriginArn: NextJsEcs.vpcOrigin.vpcOriginArn,
  shieldRegion: this.region,
  description: `${service}-${component}-${envName}-origin`,
};

// 2. Load route config
const config: GatewayRoutesConfig = JSON.parse(
  readFileSync(join(import.meta.dirname, './gateway-routes-config.json'), 'utf-8')
);

// 3. Build zone registrations from config
const zones = buildGatewayZones(config, 'content', envName, origin);

// 4. Register with the gateway
const gateway = new GatewayRegistration(this, 'GatewayRegistration', {
  configurationName: props.environment.configurationName,
  clientId: '{{resolve:secretsmanager:...}}',
  clientSecret: '{{resolve:secretsmanager:...}}',
  zones,
});

// 5. Ensure RAM share is created before registration
if (NextJsEcs.resourceShare) {
  gateway.node.addDependency(NextJsEcs.resourceShare);
}
```

### Dependency Order

The RAM resource share **must** exist before `GatewayRegistration` runs, and must be deleted **after** it. The gateway's CloudFront distribution sync Lambda needs cross-account `cloudfront:GetVpcOrigin` permission (granted by the RAM share) both when attaching and deregistering origins.

---

## Rollout Percentages

The `rolloutPercentage` field controls what percentage of matching traffic goes to your MFE vs. falling through to the default origin (SFCC).

```json
{
  "rolloutPercentage": 100
}
```

- `100` — All matching traffic goes to your MFE (production state)
- `50` — 50% of traffic goes to your MFE, 50% falls through to SFCC
- `0` — No traffic goes to your MFE (effectively disabled)

### Rollout Groups (Advanced)

For granular control, you can define rollout groups that override the default percentage for specific routes:

```json
{
  "rolloutPercentage": 100,
  "rolloutGroups": {
    "new-feature": {
      "percentage": 25,
      "routeNames": ["home-page"]
    }
  }
}
```

This sends 25% of home page traffic to your MFE while keeping all other routes at 100%.

---

## Preview / Sandbox URLs

The `GatewayRegistration` construct automatically creates preview URLs for each domain:

```typescript
// Exposed as CloudFormation outputs
new CfnOutput(this, 'PreviewUrlNl', { value: gateway.previewUrls['nl'] });
new CfnOutput(this, 'PreviewUrlCom', { value: gateway.previewUrls['com'] });
```

Preview URLs follow the pattern:
```
https://frontend-{branch}.{service}.ui-test.hema.digital/
```

These are used for:
- E2E testing in the pipeline
- Manual QA and stakeholder review
- Feature branch sandboxes (Butler)

---

## How the Routing Function Works

The gateway's CloudFront Function resolves requests in this order:

### Non-environment traffic (production)
1. Check regex rules → match against full zone-to-origin map
2. KVS lookup (prefix matching, depth-based) → match against full zone-to-origin map
3. No match → falls through to SFCC default behavior

### Environment traffic (feature branches)
1. Load env `rootConfig` from KVS → if not found: 404
2. **Phase 1** (env only): Check env regex rules and KVS entries
3. **Phase 2** (main fallback): Check main routes, but subtract zones owned by the env
4. No match → falls through to SFCC

This two-phase algorithm ensures feature branches can override specific zones without accidentally routing to main origins for routes they didn't register.

---

## The `_zones/` Prefix

Every MFE registers a `_zones/{service-id}` prefix route. This is used for:
- **Static assets** (`/_zones/omni-web-content/_next/static/...`)
- **Image optimization** (`/_zones/omni-web-content/_next/image?...`)
- **Zone-specific resources** that need to be served from the correct origin

The `assetPrefix` in `next.config.ts` must match this zone prefix. See [Multi-Zone Configuration](./multi-zone-config.md).

---

## Checklist for New MFEs

1. ☐ Add gateway management library packages to root `package.json`
2. ☐ Create `lib/runtime/gateway-routes-config.json` with your routes
3. ☐ Add `GatewayRegistration` construct to your runtime stack
4. ☐ Ensure RAM resource share dependency is set
5. ☐ Set `rolloutPercentage` (start at 0 or low for gradual rollout)
6. ☐ Configure `assetPrefix` in `next.config.ts` to match your zone prefix
7. ☐ Verify preview URLs work after first deployment

---

## Further Reading

- [Multi-Zone Configuration](./multi-zone-config.md) — next.config.ts zone setup
- [CDK Infrastructure Guide](../infrastructure/cdk-infrastructure.md) — Full stack architecture
- [Gateway routing flows](https://github.com/HemaEcom/omni-web-gateway/blob/main/docs/routing-flows.md) — Detailed routing examples
