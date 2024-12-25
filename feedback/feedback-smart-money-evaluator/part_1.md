
# Development Plan for Smart Money Evaluator - Part 1

## Background and Objectives
The goal is to migrate the **IndicatorService** logic from the reference project into the **Smart Money Evaluator** module in the new project. This involves:
1. Removing dependencies on solScan data fetching, as the new project uses Data Collector for transaction data.
2. Adapting the data model to use the `Swap` entity instead of `AmmSwap`, ensuring compatibility and completeness.
3. Maintaining tight integration with the following modules:
   - **IndicatorGraph**: Manages the dependency graph for indicators.
   - **IndicatorData**: Encapsulates individual indicator calculations.
   - **IndicatorRepository**: Handles database interactions.

---

## Phase 1: Requirement Analysis and Logic Cleanup

### Tasks
1. **Analyze IndicatorService**:
   - Identify all calls to **IndicatorGraph**, **IndicatorData**, and **IndicatorRepository**.
   - List dependencies and remove SourceGAN-related logic.

2. **Understand the New Data Model**:
   - Compare `Swap` with `AmmSwap`:
     - Identify fields missing in `Swap`.
     - Propose a strategy for fetching missing fields using Solana RPC (`getAccountInfo`).

3. **Document Changes**:
   - Update documentation to reflect the changes in data flow and dependency removal.

---

### Deliverables
1. A list of critical methods and their dependencies in **IndicatorService**.
2. Updated documentation detailing changes to data fetching and indicator calculation.

---

### Estimated Time: 2 Days
