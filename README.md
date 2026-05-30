# Wallet & Payments API

This is a REST API built with NestJS and SQLite that allows customers to hold wallet balances, 
deposit funds, and transfer money between wallets atomically.

[![NestJS](https://img.shields.io/badge/NestJS-v10+-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-lightblue.svg)](https://www.sqlite.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3+-orange.svg)](https://typeorm.io/)
[![Jest](https://img.shields.io/badge/tested%20with-Jest-99424f.svg)](https://jestjs.io/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)


## Setup Instructions

### Prerequisites
- Node.js v20 or later(v20 recommended)

### Repository
Clone the repository and switch to the appropriate branch before proceeding

```bash
git clone https://github.com/MuchiraIrungu/TechnicalAssessment.git
cd TechnicalAssessment
git checkout feat/wallet-api
```

### Setup
```bash
npm install
npm run start:dev
```

The development server starts at `http://localhost:3000`,

 
### Run Tests
```bash
npm run test
```
 
---
 
## Architecture Overview
 
The project follows NestJS's feature-module pattern. Each domain is fully self-contained with its own controller, service, DTO, and entity.
 
```
src/
├── customers/         # Customer creation and lookup
│   ├── customer.controller.ts
│   ├── customer.service.ts
│   ├── customer.entity.ts
│   ├── customer.module.ts
│   └── dto/
│       └── create-customer.dto.ts
│
├── wallets/           # Deposits and transaction listing
│   ├── wallet.controller.ts
│   ├── wallet.service.ts
│   ├── wallet.entity.ts
│   ├── wallets.module.ts
│   └── dto/
│       └── deposit-cash.dto.ts
│
├── transactions/      # Transfers and transfer lookup
│   ├── transaction.controller.ts
│   ├── transaction.service.ts
│   ├── transaction.entity.ts
│   ├── transaction.module.ts
│   └── dto/
│       └── transactions.dto.ts
│
├── filters/
│   └── global-exception.filter.ts   # Centralised error shaping
│
└── app.module.ts      # Root module — wires TypeORM and feature modules
```
 
Request flow: `Controller` validates the incoming DTO → calls `Service` → service interacts with the database via `DataSource` (TypeORM) → response returned or exception thrown and caught by the global filter.
 
---
 
## API Endpoints
 
| Method | Path | Description |
|--------|------|-------------|
| POST | `/customers` | Create a customer (wallet auto-created) |
| GET | `/customers/:id` | Fetch a customer with wallet balance |
| POST | `/wallets/:id/deposit` | Deposit funds into a wallet |
| GET | `/wallets/:id/transactions` | List wallet transactions (paginated) |
| POST | `/transfers` | Transfer funds between two wallets |
| GET | `/transfers/:id` | Fetch a single transfer by ID |
 
---
 
## Database Schema
 
### customers
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Required |
| email | VARCHAR | Unique, lowercased before save |
| createdAt | DATETIME | Auto-set on insert |
 
### wallets
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| balance | INTEGER | Stored in minor units (cents). CHECK >= 0 |
| customer_id | UUID | FK → customers, CASCADE delete |
| createdAt | DATETIME | Auto-set on insert |
| updatedAt | DATETIME | Auto-updated on save |
 
### transactions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| type | ENUM | `DEPOSIT` or `TRANSFER` |
| amount | INTEGER | Minor units (cents) |
| source_wallet_id | UUID | FK → wallets, SET NULL on delete. Null for deposits |
| destination_wallet_id | UUID | FK → wallets, CASCADE on delete |
| createdAt | DATETIME | Auto-set on insert |
 
**Design decisions:**
- Every customer gets exactly one wallet, created atomically in the same transaction as the customer.
- `source_wallet_id` is nullable so the same `transactions` table covers both deposits (no source) and transfers (has source), keeping the ledger in one place.
- Indexes on both wallet FK columns in `transactions` so pagination queries on a wallet's history stay fast as the table grows.
- `onDelete: SET NULL` on source wallet means transaction history is preserved even if the sending wallet is deleted.
---
 
## ORM Choice — TypeORM
 
TypeORM was chosen because:
- It is the default and best-supported ORM in the NestJS ecosystem.
- `QueryRunner` gives explicit, low-level control over transactions — exactly what atomic money movement requires.
- Decorator-based entities keep schema definition close to the domain model.
- `DataSource` can be injected directly into services without needing `TypeOrmModule.forFeature()`, keeping module setup lean.
---
 
## Money Representation
 
All monetary values are stored and transferred as **integer minor units (cents)**.
 
For example: `5000` = KES 50.00
 
**Why not floats:** Floating-point arithmetic is inherently imprecise. `0.1 + 0.2 === 0.30000000000000004` in JavaScript. For financial data this is unacceptable — rounding errors accumulate and money can be silently lost or created.
 
**Why not decimal strings:** SQLite does not have a native `DECIMAL` type. Storing as integer cents gives us exact arithmetic with no precision loss, and is a well-established pattern in payment systems.
 
The API accepts and returns amounts in cents. Clients are responsible for display formatting (e.g. dividing by 100 to show `KES 50.00`).
 
---
 
## Error Handling
 
All errors are caught by a global `GlobalExceptionFilter` and returned in a consistent shape:
 
```json
{
  "statusCode": 422,
  "error": "INSUFFICIENT_FUNDS",
  "message": "Insufficient funds for this transfer",
  "path": "/transfers",
  "timestamp": "2026-05-30T11:00:00.000Z"
}
```
 
| Scenario | Status | Error code |
|----------|--------|------------|
| Invalid request body | 400 | `BAD_REQUEST` with field-level messages |
| Resource not found | 404 | `NOT_FOUND` |
| Duplicate email | 409 | `CONFLICT` |
| Insufficient funds | 422 | `INSUFFICIENT_FUNDS` |
| Same-wallet transfer | 400 | `BAD_REQUEST` |
| Unexpected error | 500 | `INTERNAL_SERVER_ERROR` — no stack trace, no SQL |
 
Stack traces, SQL errors, and internal paths are never exposed to the client.
 
---
 
## Trade-offs & Assumptions
 
- **No authentication.** The brief explicitly excluded auth. In production every endpoint would be protected.
- **`synchronize: true`** is enabled in TypeORM config. This auto-migrates the schema on startup, which is fine for development but would be replaced with proper migrations before going to production.
- **Race condition on duplicate email.** A pre-check query runs before the transaction to catch duplicates cleanly. There is a theoretical race window between the check and the insert on concurrent requests; the database's UNIQUE constraint acts as the final safety net.
- **SQLite in development only.** SQLite does not enforce `unsigned` on integer columns at the DB level. A `CHECK (balance >= 0)` constraint is applied on the wallet entity to compensate. In production this would be Postgres, which enforces constraints natively.
- **No soft deletes.** Customers and wallets are hard-deleted. Transaction history for deleted wallets is preserved via `SET NULL` on the source wallet FK.
- **Amounts are always positive.** DTOs enforce `@IsPositive()` — zero and negative amounts are rejected at the validation layer before reaching the service.
---
 
## What I Would Do Next
 
Given another day, I would:
 
1. **Migrations** — Replace `synchronize: true` with TypeORM migrations for safe, versioned schema changes.
2. **Authentication** — Add JWT-based auth so wallets are only accessible to their owner.
3. **Postgres support** — Swap SQLite for Postgres in production config; use environment-based TypeORM configuration.
4. **Integration tests** — Add end-to-end tests using NestJS's `supertest` helpers against a real in-memory SQLite database, not just unit tests with mocks.
5. **Idempotency keys** — Accept an `Idempotency-Key` header on deposit and transfer endpoints to safely handle duplicate requests from clients.
6. **Rate limiting** — Add `@nestjs/throttler` to prevent abuse of the deposit and transfer endpoints.
7. **Decimal display layer** — Add a response interceptor that converts cent values to formatted decimal strings for API consumers.
---
 
## Sample Requests
 
See [`requests.http`](./requests.http) for the full collection — open in VS Code with the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension and click **Send Request** above any block.
 
### 1. Create a Customer
```bash
curl -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -d '{"name": "testName", "email": "test@gmail.com"}'
```
```json
{
  "id": "13811e48-2dbb-41da-ba3a-4922c8e44639",
  "name": "testName",
  "email": "test@gmail.com",
  "wallet": {
    "id": "646c46b9-3b16-4a1c-8b31-7d981818d572",
    "balance": 0,
    "createdAt": "2026-05-29T14:01:12.000Z"
  },
  "createdAt": "2026-05-29T14:01:12.000Z"
}
```
 
### 2. Get a Customer
```bash
curl http://localhost:3000/customers/13811e48-2dbb-41da-ba3a-4922c8e44639
```
```json
{
  "id": "13811e48-2dbb-41da-ba3a-4922c8e44639",
  "name": "testName",
  "email": "test@gmail.com",
  "wallet": {
    "id": "646c46b9-3b16-4a1c-8b31-7d981818d572",
    "balance": 6000,
    "createdAt": "2026-05-29T14:01:12.000Z"
  },
  "createdAt": "2026-05-29T14:01:12.000Z"
}
```
 
### 3. Deposit Funds
```bash
curl -X POST http://localhost:3000/wallets/646c46b9-3b16-4a1c-8b31-7d981818d572/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'
```
```json
{
  "id": "646c46b9-3b16-4a1c-8b31-7d981818d572",
  "balance": 9000,
  "createdAt": "2026-05-29T14:01:12.000Z"
}
```
 
### 4. Successful Transfer
```bash
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sourceWalletId": "646c46b9-3b16-4a1c-8b31-7d981818d572",
    "destinationWalletId": "9fc773c7-face-4183-bbaf-f8ea5c234e3f",
    "amount": 3000
  }'
```
```json
{
  "id": "007b9f54-e3b9-43a3-8b7b-4e3e9679460a",
  "type": "TRANSFER",
  "amount": 3000,
  "sourceWallet": {
    "id": "646c46b9-3b16-4a1c-8b31-7d981818d572",
    "balance": 6000,
    "createdAt": "2026-05-29T14:01:12.000Z"
  },
  "destinationWallet": {
    "id": "9fc773c7-face-4183-bbaf-f8ea5c234e3f",
    "balance": 4000,
    "createdAt": "2026-05-29T16:44:57.000Z"
  },
  "createdAt": "2026-05-30T14:15:49.000Z"
}
```
 
### 5. Failed Transfer — Insufficient Funds
```bash
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sourceWalletId": "646c46b9-3b16-4a1c-8b31-7d981818d572",
    "destinationWalletId": "9fc773c7-face-4183-bbaf-f8ea5c234e3f",
    "amount": 999999
  }'
```
```json
{
  "statusCode": 422,
  "error": "INSUFFICIENT_FUNDS",
  "message": "Try a lower amount",
  "path": "/transfers",
  "timestamp": "2026-05-30T14:16:17.454Z"
}
```
 
### 6. Failed Transfer — Same Wallet
```bash
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sourceWalletId": "646c46b9-3b16-4a1c-8b31-7d981818d572",
    "destinationWalletId": "646c46b9-3b16-4a1c-8b31-7d981818d572",
    "amount": 500
  }'
```
```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "The source and destination wallets should be different",
  "path": "/transfers",
  "timestamp": "2026-05-30T14:17:06.454Z"
}
```
 
### 7. Get Transfer by ID
```bash
curl http://localhost:3000/transfers/007b9f54-e3b9-43a3-8b7b-4e3e9679460a
```
```json
{
  "id": "007b9f54-e3b9-43a3-8b7b-4e3e9679460a",
  "type": "TRANSFER",
  "amount": 3000,
  "sourceWallet": {
    "id": "646c46b9-3b16-4a1c-8b31-7d981818d572",
    "balance": 6000,
    "createdAt": "2026-05-29T14:01:12.000Z"
  },
  "destinationWallet": {
    "id": "9fc773c7-face-4183-bbaf-f8ea5c234e3f",
    "balance": 4000,
    "createdAt": "2026-05-29T16:44:57.000Z"
  },
  "createdAt": "2026-05-30T14:15:49.000Z"
}
```
 
### 8. List Wallet Transactions (paginated)
```bash
curl "http://localhost:3000/wallets/646c46b9-3b16-4a1c-8b31-7d981818d572/transactions?page=1&limit=10"
```
```json
{
  "data": [
    {
      "id": "007b9f54-e3b9-43a3-8b7b-4e3e9679460a",
      "type": "TRANSFER",
      "amount": 3000,
      "sourceWallet": { "id": "646c46b9-3b16-4a1c-8b31-7d981818d572", "balance": 6000 },
      "destinationWallet": { "id": "9fc773c7-face-4183-bbaf-f8ea5c234e3f", "balance": 4000 },
      "createdAt": "2026-05-30T14:15:49.000Z"
    },
    {
      "id": "0db57173-1dbc-4ff2-9fcb-1895d809097e",
      "type": "DEPOSIT",
      "amount": 5000,
      "sourceWallet": null,
      "destinationWallet": { "id": "646c46b9-3b16-4a1c-8b31-7d981818d572", "balance": 6000 },
      "createdAt": "2026-05-30T14:14:55.000Z"
    }
  ],
  "total": 4
}
```


## Contact
cmuchirairungu@gmail.com