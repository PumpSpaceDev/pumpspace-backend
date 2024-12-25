
# Development Plan for Smart Money Evaluator - Part 2

## Phase 2: Database Adaptation and Data Source Updates

### Tasks
1. **Refactor `load30DaysTradeData`**:
   - Replace `AmmSwap` with `Swap` for data queries.
   - Use the `swap.amm` field to fetch missing data via Solana RPC (`getAccountInfo`).
   - Validate that the new data fetching mechanism matches existing functionality.

2. **Update Database Interactions**:
   - Ensure all queries in **IndicatorRepository** adapt to the `Swap` table structure.
   - Add support for mapping between `AmmSwap` and `Swap` where necessary.

3. **Test Data Flow**:
   - Validate that the new data model works seamlessly with the existing indicator calculation logic.

---

### Deliverables
1. Refactored `load30DaysTradeData` function.
2. Updated database queries in **IndicatorRepository**.
3. Test cases for the new data fetching mechanism.

---

### Estimated Time: 3 Days
