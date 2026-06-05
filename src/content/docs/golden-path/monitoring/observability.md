---
title: "Monitoring & Observability"
---


> **Source**: `omni-web-content-frontend/lib/`, `@hema/monitoring-constructs`, `@hema/monitoring-logger`

## Overview

MFE monitoring uses two layers:
1. **Infrastructure alarms** — CloudWatch alarms on ECS/ALB metrics, published via `AlertPublisher`
2. **Application logging** — Structured JSON logs via `@hema/monitoring-logger` (Winston-based)

## Infrastructure Alarms

### AlertPublisher

The `AlertPublisher` from `@hema/monitoring-constructs` subscribes to CloudWatch alarms and publishes alerts to HEMA's central alerting system.

```typescript
// lib/runtime/runtime-stack.ts
import { AlertPublisher, HemaAuthorization } from '@hema/monitoring-constructs';

if (!props.environment.temporary) {
  const publisher = new AlertPublisher(this, 'AlertPublisher', {
    authorization: HemaAuthorization.oauth(params.resolved.securityCredentials),
    environment: createEnvironment(
      props.environment.name,
      props.environment.service,
      props.environment.component,
    ),
  });

  publisher.subscribeAlarms(...NextJsEcs.getAlarms());
}
```

Key points:
- Only enabled for **non-temporary** environments (not sandboxes)
- Uses OAuth credentials from Secrets Manager for authentication
- Subscribes to all alarms from the ECS bundle

### Alarm Types

The `EcsNextJsBundle` provides these alarms:

| Alarm | Source | Level | Description |
|-------|--------|-------|-------------|
| ECS CPU Utilization | `EcsService` | `warn` | CPU usage exceeds threshold |
| ECS Memory Utilization | `EcsService` | `warn` | Memory usage exceeds threshold |
| ALB 5xx Error Rate | `LoadBalancer` | `error` | Backend returning 5xx responses |
| ALB Unhealthy Hosts | `LoadBalancer` | `error` | Target group has unhealthy hosts |

### Alarm Sensitivity Levels

```typescript
// lib/common/alarms/alarm-sensitivity-options.ts
export enum AlarmSensitivityLevel {
  LOW = 'LOW',      // 5 of 8 periods, threshold 5
  MEDIUM = 'MEDIUM', // 3 of 5 periods, threshold 3
  HIGH = 'HIGH',    // 1 of 1 period, threshold 1
}
```

All levels use `TreatMissingData.NOT_BREACHING` (missing data = OK).

### Runbook Links

Alarms include a runbook URL pointing to the service catalog:
```
https://servicecatalog.ui.hema.digital/docs/default/system/<service>/operations/runbooks
```

## Application Logging

### Logger Setup

```typescript
// src/utils/logger.ts
import { DefaultScrubber, LogLevel, WinstonLogger } from '@hema/monitoring-logger';

// Production: structured JSON with PII scrubbing
const prodLogger = new WinstonLogger(
  new DefaultScrubber(),
  environment,
  { stage: environmentName },
  logLevel,
);

// Development: human-readable colored output
const devLogger = createLogger({ ... });

export const logger = IS_PRODUCTION ? prodLogger : devLogger;
```

### Log Levels

Controlled by `LOG_LEVEL` environment variable (SSM parameter):
- `error` — Errors that need attention
- `warn` — Unexpected but handled situations
- `info` — Normal operations
- `debug` — Detailed debugging (default in dev)

### Usage

```typescript
import { logger } from '@/utils/logger';

// Structured logging with context
logger.info({ msg: 'Page rendered', locale, path, pageType });
logger.warn({ msg: 'No home page path for locale', locale });
logger.error({ msg: 'Failed to generate metadata', locale, error });
```

### PII Scrubbing

The `DefaultScrubber` from `@hema/monitoring-logger` automatically removes sensitive data from logs before they're written.

## Sanity Request Tagging

All Sanity API requests are tagged for monitoring:

```typescript
requestTagPrefix: createRequestTag(requestTagPrefix), // "omni-web-content"
// Draft requests: "omni-web-content.draft"
```

This enables per-service query monitoring in the Sanity dashboard (API usage, query performance, cache hit rates).

## Health Check

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return new Response('OK', { status: 200 });
}
```

Used by:
- ALB target group health checks (`/api/health`)
- Container health checks
- Uptime monitoring

## Adding Monitoring to a New MFE

1. **Use `EcsNextJsBundle`** — it creates alarms automatically
2. **Add `AlertPublisher`** in your runtime stack (non-temporary envs only)
3. **Set up the logger** using `@hema/monitoring-logger`:
   ```bash
   npm install @hema/monitoring-logger @hema/common-types winston
   ```
4. **Add `LOG_LEVEL` SSM parameter** for your service
5. **Create runbooks** in your service catalog docs
6. **Tag Sanity requests** with your service prefix
