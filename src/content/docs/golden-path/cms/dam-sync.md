---
title: "DAM Sync"
sidebar:
  order: 5
---

> **Source**: `omni-cms-composable-cms/infrastructure/lib/components/dam-sync-kafka.ts`
>
> 📐 **ADR:** [ADR-0010 — CMS NOT to consume Bynder directly](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6232604673) — Decision: asset metadata syncs via an event pipeline, not by the CMS querying Bynder at render time.

## Overview

All images in the CMS come from **Bynder** (HEMA's Digital Asset Management). Direct uploads are disabled. When asset metadata changes in Bynder, a Kafka-based pipeline syncs those changes to Sanity.

## Pipeline Architecture

```d2
direction: down

bynder: "Bynder DAM" {
  style.fill: "#FFCCBC"
  note: "MediaUpdated / MediaDeleted events"
}

kafka: "Kafka Topic\nHema.dam-engine.BynderAssets" {
  style.fill: "#FFF9C4"
}

pipe: "EventBridge Pipe\n(Schema Decode + Filter)" {
  style.fill: "#E3F2FD"
}

sqs: "SQS FIFO Queue\nbynder-dam-events-<stage>" {
  style.fill: "#E3F2FD"
}

lambda: "DAM Sync Lambda\n(batch: 10, timeout: 30s)" {
  style.fill: "#E8F5E9"
}

sanity: "Sanity Content Lake" {
  style.fill: "#F3E5F5"
}

bynder -> kafka -> pipe -> sqs -> lambda -> sanity
```

## What Gets Synced

| Bynder Change | Sanity Update |
|---------------|---------------|
| Tags changed | Updates `opt.media.tags` on asset + creates `media.tag_*` documents |
| Description changed | Updates `description` on asset document |
| Metadata properties changed | Updates `metadata` object on `asset.metadata` document |
| Archive status changed | Updates `archived` flag |
| Media version changed | Flags as `input_required` (manual action needed) |

Only `MediaUpdated` and `MediaDeleted` events are processed (filtered at the pipe level).

## Components

### Kafka Pipe (EventBridge)

```typescript
new KafkaPipe(this, "BynderEventsPipe", {
  topicName: "Hema.dam-engine.BynderAssets",
  consumerGroupId: `${service}-${stage}-dam-sync`,
  batchSize: 100,
  maximumBatchingWindowInSeconds: 5,
  startingPosition: "LATEST",
  enrichment: new SchemaDecodeEnrichLambda(...),
  target: new KafkaRecordsToSqsLambda(...),
});
```

### SQS FIFO Queue

- FIFO with content-based deduplication
- Dead-letter queue for failed messages
- S3 bucket for oversized payloads

### DAM Sync Lambda

Finds related Sanity documents by Bynder `media_id`, builds a transaction with patches, and commits atomically.

### Asset Cleanup Scheduler

A scheduled Lambda removes unused/orphaned assets:

```typescript
new AssetCleanupScheduler(this, "AssetCleanupScheduler", {
  cleanupSchedule: props.assetCleanupSchedule,
  dryRun: props.assetCleanupDryRun,
  gracePeriodDays: props.assetCleanupGracePeriodDays,
  maxDeletions: props.assetCleanupMaxDeletions,
});
```

## Bynder Plugin (Studio Side)

The Studio uses a custom Bynder plugin (`plugins/bynder/`) that:
- Replaces default image upload with Bynder's Compact View
- Imports assets with `source.name = "bynder"` and `source.id = <media-id>`
- Stores metadata in a companion `asset.metadata` document

```typescript
// sanity.config.ts
form: {
  image: { assetSources: () => [bynderMediaSource], directUploads: false },
  file: { assetSources: () => [bynderMediaSource], directUploads: false },
},
```

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Asset not syncing | Media ID not in Sanity | Re-import asset from Bynder in Studio |
| Tags not updating | Failed messages | Check DLQ, replay messages |
| `input_required` status | Media file version changed | Editor must re-select asset in Studio |
| Lambda timeout | Large batch | Check batch size config |
