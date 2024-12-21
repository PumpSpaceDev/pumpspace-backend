# PumpSpace Backend Development Plan for Devin.ai

## Overall Approach
- Utilize **NestJS Framework** for backend service development, ensuring modular and scalable design.
- Implement a **monorepo structure** to manage multiple microservices within a single project for simplicity and maintainability.
- Adhere to the established technical architecture, with flexibility for future adjustments.

---

## 1. Project Structure

Monorepo structure using NestJS’s CLI Workspace for managing multiple microservices:

```
pumpspace-backend/
├── apps/
│   ├── data-collector/        # Data Collection Microservice
│   ├── analysis-statistics/   # Analysis & Token Statistics Microservice
│   ├── notification/          # Notification Microservice
│   ├── signal-recorder/       # Signal Recorder Microservice
│   ├── signal-analyzer/       # Signal Analyzer Microservice
│   ├── smart-money-evaluator/ # Smart Money Evaluation Microservice
├── libs/
│   ├── shared/                # Shared modules (e.g., database, Redis client, utilities)
│   ├── interfaces/            # API and DTO definitions
│   ├── config/                # Centralized configuration management
├── package.json
├── nest-cli.json              # NestJS CLI configuration
├── tsconfig.json

```


---

## 2. Key Components

### a. Microservices

Each microservice under `apps/` has its own `main.ts` file and application module. They interact through Redis Pub/Sub and share utilities from `libs/`.

#### 1. Data Collector Microservice
**Responsibilities**:
- Filter Raydium transactions from Solana gRPC data streams.
- Persist filtered transactions to PostgreSQL.
- Publish Raydium-related transactions to Redis Pub/Sub.

**Dependencies**:
- PostgreSQL module for transaction persistence.
- Redis module for publishing data.

#### 2. Analysis & Token Statistics Microservice
**Responsibilities**:
- Subscribe to Redis Pub/Sub for Raydium transactions.
- Perform Smart Money matching.
- Maintain Token statistics using a sliding window and Redis storage.
- Push Smart Money matches to the Notification Microservice.

**Dependencies**:
- Redis for sliding window data.
- Token statistics and Smart Money match logic modules.

#### 3. Notification Microservice
**Responsibilities**:
- Consume Smart Money matches from Redis Pub/Sub.
- Apply advanced filtering rules for notification.
- Push notifications to users (e.g., Telegram Bot).

**Dependencies**:
- Messaging and notification utilities.

#### 4. Signal Recorder Microservice
**Responsibilities**:
- Collect and store signals from external sources (e.g., Telegram Channels).
- Persist signal data to PostgreSQL.

**Dependencies**:
- PostgreSQL module for signal storage.

#### 5. Signal Analyzer Microservice
**Responsibilities**:
- Analyze historical signal data for performance metrics.
- Store results in PostgreSQL for frontend display.

**Dependencies**:
- PostgreSQL for historical data retrieval and storage.

#### 6. Smart Money Evaluator Microservice
**Responsibilities**:
- Evaluate initial Smart Money address list for profitability.
- Update advanced Smart Money address list in PostgreSQL.

**Dependencies**:
- PostgreSQL for initial and advanced address management.

---

### b. Shared Libraries

Located under `libs/` to ensure code reuse and consistency:

#### 1. Shared Modules:
- **Database connection**: PostgreSQL.
- **Redis client**: For Pub/Sub communication.
- **Common utilities**: Logging, error handling.

#### 2. Interfaces:
- Centralized API definitions using TypeScript DTOs.
- OpenAPI/Swagger integration for API documentation.

#### 3. Configuration:
- Centralized environment variable management.
- Example: `.env` files for each microservice, consolidated in `libs/config`.

---

## 3. Development Workflow

### 1. Initial Setup:
- Initialize monorepo using `nest new pumpspace-backend --monorepo`.
- Create individual apps for each microservice using `nest generate app <microservice-name>`.
- Add shared libraries using `nest generate library <library-name>`.

### 2. Core Integrations:
#### Database:
- Use `@nestjs/typeorm` for PostgreSQL ORM.
- Centralize database entities and connections in `libs/shared`.

#### Redis:
- Use `@nestjs/microservices` for Redis Pub/Sub.
- Centralize Redis clients in `libs/shared`.

### 3. Communication Protocols:
#### Internal:
- Use Redis Pub/Sub for real-time communication between microservices.

#### External:
- Integrate gRPC with Shyft for Solana data.

### 4. Testing:
- Unit tests for each module and shared library.
- End-to-end tests for inter-microservice communication.

### 5. Deployment:
- Use Docker for containerization.
- Use Kubernetes or Docker Compose for orchestration.

---

## 4. Technical Highlights

### 1. Centralized Configuration:
- Use `libs/config` to manage all microservices’ configurations.
- Environment-specific variables (e.g., `DATABASE_URL`, `REDIS_URL`).

### 2. Type Safety:
- Define all DTOs and interfaces in `libs/interfaces` for consistent API contracts.

### 3. Code Reusability:
- Common functionalities (e.g., database connection, Redis client) abstracted into shared modules under `libs/shared`.

### 4. Scalability:
- Microservices designed to scale independently.
- Redis Pub/Sub ensures decoupled, real-time communication.

---

## Next Steps

### 1. Project Initialization:
- Set up the monorepo structure with NestJS CLI.
- Implement base configurations for database and Redis.

### 2. Microservice Development:
- Start with **Data Collector Service** and **Smart Money Evaluator Microservice**.

### 3. Documentation:
- Define APIs and data flows using Swagger/OpenAPI.

### 4. Review and Feedback:
- Validate the architecture with incremental development and testing.
