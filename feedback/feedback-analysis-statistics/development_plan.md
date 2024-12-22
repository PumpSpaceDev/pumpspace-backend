
# Development Plan for Analysis-Statistics Module

## Overview
The `analysis-statistics` module is responsible for:
1. Processing Solana transactions to extract meaningful insights.
2. Updating token statistics in real-time using Redis and maintaining persistent storage.
3. Identifying and publishing "Smart Money" matched transactions for further analysis.

---

## Steps to Implement
### Step 1: Refactor Shared Redis Module
- Centralize Redis Pub/Sub and caching logic in a shared module.
- Methods to implement:
  1. `subscribe(channel: string, callback: Function)`: Listen to Redis channels.
  2. `publish(channel: string, message: object)`: Publish messages to a Redis channel.
  3. `get(key: string)`: Fetch cached data.
  4. `set(key: string, value: object, ttl?: number)`: Cache data with optional expiry.

### Step 2: Process Transactions
- Implement the `processTransaction` function:
  - Fetch AMM Pool information from Redis or Solana RPC.
  - Determine if the transaction is a "buy" or "sell."
  - Parse and publish structured event data (`parsedEvent`).

### Step 3: Update Token Statistics
- Calculate sliding-window statistics using Redis.
- Design time-bucketed keys for various time intervals (e.g., `5m`, `1h`, `24h`).
- Periodically persist Redis data to a database for long-term storage.

### Step 4: Publish Smart Money Matches
- Check transaction signer against the Smart Money address list.
- Publish results to a dedicated Redis channel (`smart-money:matches`).

---

## Development Milestones
1. Set up the shared Redis module.
2. Integrate Redis module into `analysis-statistics`.
3. Develop and test `processTransaction` logic.
4. Implement token statistics update and persistence.
5. Finalize Smart Money match logic and event publishing.

