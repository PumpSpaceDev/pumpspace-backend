
# Token Statistics Logic

## Overview
Real-time token statistics are calculated using a sliding window approach and stored in Redis.

---

## Implementation

```typescript
private async updateTokenStatistics(tokenId: string, amountIn: bigint, amountOut: bigint) {
  const now = new Date();
  const volume = Number(amountIn);
  const price = Number(amountOut) / Number(amountIn);

  for (const window of this.bucketWindows) {
    const bucketKey = `${tokenId}:${window}:${this.getBucketTimestamp(now, window)}`;
    const existingBucket = await this.redisService.get(bucketKey) || {};

    const updatedBucket = {
      volume: (existingBucket.volume || 0) + volume,
      price: price,
      transactionCount: (existingBucket.transactionCount || 0) + 1,
      lastUpdated: now.toISOString(),
    };

    await this.redisService.set(bucketKey, updatedBucket, this.getWindowTTL(window));
  }
}
```

---

## Key Points
1. **Time Window Management**:
   - Each token statistic is divided into `5m`, `1h`, and `24h` windows.
   - Buckets are identified by start timestamps.

2. **Redis TTL**:
   - Data in Redis is auto-expired to save memory.

3. **Periodic Persistence**:
   - Periodically save aggregated statistics to the database.

