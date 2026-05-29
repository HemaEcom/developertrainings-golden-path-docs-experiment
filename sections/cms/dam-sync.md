# DAM Sync — Bynder Asset Synchronization

> **Source**: `omni-cms-composable-cms/infrastructure/lib/components/dam-sync-kafka.ts`, `infrastructure/lib/lambdas/dam-sync.ts`

## Overview

All images in the CMS come from **Bynder** (HEMA's Digital Asset Management system). Direct uploads are disabled. When asset metadata changes in Bynder, a Kafka-based pipeline syncs those changes to Sanity automatically.

## Architecture

```
┌──────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Bynder  │────▶│  Kafka Topic        │────▶│  EventBridge     │
│  DAM     │     │  Hema.dam-engine.   │     │  Pipe            │
│          │     │  BynderAssets        │     │                  │
└──────────┘     └─────────────────────┘     └──────────────────┘
                                                      │
                                                      │ Schema Decode
                                                      │ + Filter
                                                      ▼
                                              ┌──────────────────┐
                                              │  SQS FIFO Queue  │
                                              │  (bynder-dam-    │
                                              │   events-<stage>)│
                                              └──────────────────┘
                                                      │
                                                      │ Batch (10)
                                                      ▼
                                              ┌──────────────────┐
                                              │  DAM Sync Lambda │
                                              │  (30s timeout)   │
                                              └──────────────────┘
                                                      │
                                                      │ Sanity Client
                                                      ▼
                                              ┌──────────────────┐
                                              │  Sanity Content  │
                                              │  Lake            │
                                              └──────────────────┘
```

## Components

### 1. Kafka Pipe (EventBridge)

Uses `@hema/eventstreaming-constructs` to create a pipe from Kafka to SQS:

```typescript
new KafkaPipe(this, "BynderEventsPipe", {
  topicName: "Hema.dam-engine.BynderAssets",
  consumerGroupId: `${service}-${stage}-dam-sync`,
  batchSize: 100,
  maximumBatchingWindowInSeconds: 5,
  startingPosition: "LATEST",
  enrichment: new SchemaDecodeEnrichLambda(...), // Avro → JSON
  target: new KafkaRecordsToSqsLambda(...),     // → SQS
});
```

**Filter condition**: Only `MediaUpdated` and `MediaDeleted` events are processed:
```typescript
filterCondition: `value.payload.eventType == 'MediaUpdated' || value.payload.eventType == 'MediaDeleted'`
```

### 2. SQS FIFO Queue

- **Queue name**: `bynder-dam-events-<stage>` (or `bynder-dam-events-<project>-<stage>` for non-prod)
- **FIFO**: Yes (content-based deduplication)
- **DLQ**: Yes (failed messages go to dead-letter queue)
- **Large message bucket**: S3 bucket for oversized payloads

### 3. DAM Sync Lambda

Processes SQS messages and updates Sanity documents:

**What it syncs:**
| Bynder Change | Sanity Update |
|---------------|---------------|
| Tags changed | Updates `opt.media.tags` on asset + creates `media.tag_*` documents |
| Description changed | Updates `description` on asset document |
| Metadata properties changed | Updates `metadata` object on `asset.metadata` document |
| Archive status changed | Updates `archived` flag on metadata document |
| Media version changed | Flags as `input_required` (manual action needed) |

**Processing logic:**
```typescript
export const handler = async (event) => {
  // 1. Parse SQS messages
  // 2. Find related Sanity documents by Bynder media_id
  const relatedDocuments = await client.fetch(
    '*[source.id in $ids && source.name == "bynder"]',
    { ids: uniqMediaIds }
  );

  // 3. Separate asset documents from metadata documents
  const [metadata, assets] = partition(
    doc => doc._type === 'asset.metadata',
    relatedDocuments
  );

  // 4. Build transaction with patches
  const transaction = client.transaction();
  // ... patch tags, description, metadata

  // 5. Commit all changes atomically
  await transaction.commit();
};
```

### 4. Asset Cleanup Scheduler

A scheduled Lambda that removes unused/orphaned assets:

```typescript
new AssetCleanupScheduler(this, "AssetCleanupScheduler", {
  cleanupSchedule: props.assetCleanupSchedule,
  dryRun: props.assetCleanupDryRun,
  gracePeriodDays: props.assetCleanupGracePeriodDays,
  maxDeletions: props.assetCleanupMaxDeletions,
});
```

## Bynder Plugin (Studio Side)

The Studio uses a custom Bynder media source plugin (`plugins/bynder/`) that:
- Replaces the default image/file upload with Bynder's Compact View
- Imports selected assets into Sanity with `source.name = "bynder"` and `source.id = <bynder-media-id>`
- Stores asset metadata in a companion `asset.metadata` document

```typescript
// sanity.config.ts
form: {
  image: {
    assetSources: () => [bynderMediaSource],
    directUploads: false,
  },
  file: {
    assetSources: () => [bynderMediaSource],
    directUploads: false,
  },
},
```

## License Territory Tracking

The DAM sync tracks license territories from Bynder metadata. Known territories:
- Netherlands, Belgium, Germany, France, Luxembourg, Austria, UAE
- Special territories: Europe (includes all EU countries), Global (includes all)

This is used to validate that assets are licensed for the country where they're displayed.

## Monitoring

The DAM sync Lambda logs processing results:
```json
{
  "status": "success",
  "message": "Metadata updated",
  "mediaId": "abc-123",
  "documents": ["image-xyz", "asset.metadata-xyz"]
}
```

Messages with `status: "input_required"` indicate media version changes that need manual review (the actual image file changed, not just metadata).

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Asset not syncing | Media ID not found in Sanity | Re-import the asset from Bynder in Studio |
| Tags not updating | DLQ messages | Check DLQ for failed messages, replay |
| "input_required" status | Bynder media version changed | Editor must re-select the asset in Studio |
| Lambda timeout | Too many assets in batch | Check batch size, increase timeout if needed |
