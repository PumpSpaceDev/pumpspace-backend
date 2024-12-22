
# Process Transaction Logic

## Overview
The `processTransaction` function handles the entire transaction analysis flow:
1. Fetch AMM Pool data.
2. Determine the transaction direction (buy/sell).
3. Parse the transaction into `parsedEvent`.
4. Publish parsed events to Redis.

---

## Implementation

```typescript
private async processTransaction(transaction: SwapDto) {
  try {
    const ammAccount = transaction.amm;
    let poolInfo = await this.redisService.get(`amm:${ammAccount}`);

    if (!poolInfo) {
      const response = await this.solanaRpcService.getAmmAccountInfo(ammAccount);
      if (!response) {
        this.logger.error(`AMM Pool ${ammAccount} not found.`);
        return;
      }
      poolInfo = this.parseAmmData(response);
      await this.redisService.set(`amm:${ammAccount}`, poolInfo, 86400); // Cache for 1 day
    }

    const isBuy = this.determineBuyOrSell(transaction, poolInfo);
    const parsedEvent = this.createParsedEvent(transaction, poolInfo, isBuy);

    await this.redisService.publish('smart-money:matches', parsedEvent);
    this.logger.log(`Published parsed event: ${JSON.stringify(parsedEvent)}`);
  } catch (error) {
    this.logger.error(`Error processing transaction: ${error.message}`);
  }
}
```

---

## Key Methods
1. **`getAmmAccountInfo`**:
   - Fetches AMM Pool data from Solana RPC.

2. **`parseAmmData`**:
   - Decodes and formats the raw AMM Pool data.

3. **`determineBuyOrSell`**:
   - Analyzes transaction direction based on pool information.

4. **`createParsedEvent`**:
   - Constructs the final event object for publishing.

