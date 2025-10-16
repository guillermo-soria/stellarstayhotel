# StellarStay Hotels - Backend Assessment

**Author:** Guillermo Soria  
**Date:** 2025-10-08  
**Assessment Duration:** 2 Days  
**Implementation Option:** A (Room Search + Booking)

## Project Overview

StellarStay Hotels scalable reservation system implementing hexagonal architecture with dynamic pricing, built with Node.js/TypeScript. The system handles complex business rules, maintains 99.9% uptime requirements, and scales from 1,000 to 50,000+ bookings/day.

**Key Features:**
- ✅ **GET /api/rooms/available** - Real-time room availability with dynamic pricing
- ✅ **POST /api/reservations** - Complete booking workflow with business validation  
- ✅ **Hexagonal Architecture** - Clean separation of concerns with ports/adapters
- ✅ **Dynamic Pricing Engine** - Weekend uplift, length discounts, breakfast options
- ✅ **Reliability Patterns** - Retry policies, timeout management, error handling
- ✅ **Data Consistency** - Shared repository instances prevent double-booking
- ✅ **Comprehensive Testing** - All unit + integration tests passing
- ✅ **Caching Layer** - Cache-aside for availability with invalidation on booking

## Quick Start

```bash
# Clone and setup
git clone <your-repo>
cd stellarstayhotel

# Install dependencies  
npm install

# Setup database (first time only)
npx prisma migrate dev
npx prisma db seed

# Start development server
npm run dev

# Run all tests
npm test

# Run integration tests
npm run test:integration

# Access database (optional)
npx prisma studio
```

## Health and Readiness Endpoints

- GET `/health` (liveness)
  - Purpose: fast liveness signal (<50ms). 
  - Payload: service status and reliability metrics/circuit breaker states. 
  - Note: does not include cache diagnostics to keep it lean.

- GET `/ready` (readiness)
  - Purpose: indicate instance is ready to serve traffic. 
  - Checks:
    - Memory usage with two-tier thresholds (configurable via env):
      - `READINESS_MEMORY_WARNING_MB` (default 200) — warning is non-fatal; readiness remains HTTP 200
      - `READINESS_MEMORY_CRITICAL_MB` (default 500) — critical is fatal; readiness returns HTTP 503
      - Note: critical must be greater than warning; validated on startup.
    - Circuit breakers: if any are OPEN, readiness is degraded (503)
    - Database connectivity: real DB ping using Prisma `$queryRaw`
  - Diagnostics included for observability:
    - cache.engine (in-memory)
    - cache.ttlSeconds (from `CACHE_TTL_SECONDS`)
    - cache.stats (hits, misses, hitRate)
    - cache.availabilityVersion (global version used for invalidation)
    - db (healthy/unreachable status)

Why treat memory warnings as non-fatal? This prevents transient heap spikes from flipping readiness during normal operation and avoids flakiness in tests where environment memory can vary. Readiness only fails on critical memory pressure or degraded reliability (OPEN circuit breakers), providing stable and actionable signals.

## Caching Strategy

The service implements a cache-aside strategy for the availability query to reduce read load and improve latency under traffic spikes.

- Scope: Only GET /api/rooms/available is cached.
- Key: Derived from normalized request parameters + a global availability version.
- Store: In-memory by default, Redis-ready via a CachePort interface.
- TTL: Configurable via env `CACHE_TTL_SECONDS` (default 90s). Suggested 30–60s in production.
- Invalidation: Automatic on successful reservation creation. The repository increments the room's `availabilityVersion` and a global in-process version in a single database transaction. Any subsequent availability request computes a new cache key and bypasses stale entries.
- Metrics: Basic hit/miss counters and availability version are exposed via `/ready` under `checks.cache` (not included in `/health`).

Why global versioning? It is simple and safe for small scale. For finer granularity, see Future Improvements.

### Environment Variables

- `CACHE_TTL_SECONDS` — TTL in seconds for cached availability results. Default 90.
- `IDEMPOTENCY_TTL_SECONDS` — Controls retention for idempotency keys (future external store).
- `READINESS_MEMORY_WARNING_MB` — Readiness memory warning threshold in MB (non-fatal). Default 200.
- `READINESS_MEMORY_CRITICAL_MB` — Readiness memory critical threshold in MB (fatal). Default 500.
- `REDIS_URL` — Optional, for a future Redis cache adapter.

### Trade-offs

- Global invalidation may evict unrelated availability entries after any booking. With Redis and per-room snapshots, we can limit invalidation scope.
- Shorter TTL reduces staleness but increases DB load. Start at 30–60s and tune with hitRate metrics.

### Future Improvements

- Granular invalidation: include per-room version snapshots in the key to avoid global busting.
- Redis adapter: shared cache across instances; expose richer metrics and eviction policies.
- Per-room getById cache: add a small TTL cache for hot paths validating room/type/capacity.
- Idempotency + cache: ensure repeated keys return same reservation without bumping version.

## Database Setup

The project uses **SQLite** for development and **Prisma** as the ORM.

### First-time setup:
```bash
# Install runtime/dev helpers (Prisma seed uses ts-node)
npm install
npm install -D ts-node

# Generate Prisma client (required after changes to schema)
npx prisma generate

# Apply migrations (development)
npx prisma migrate dev

# Seed the database
npx prisma db seed
# Note: this project configures the Prisma seed command via a "prisma" block in package.json
# which runs: "ts-node prisma/seed.ts". Prisma prints a deprecation warning for the
# package.json-based config in Prisma v6 and recommends migrating to a dedicated
# Prisma config file (e.g., `prisma.config.ts`). See: https://pris.ly/prisma-config

# Fallback (if `npx prisma db seed` fails):
# Run the TypeScript seed script directly with ts-node
npx ts-node prisma/seed.ts
```

### Database location:
- **File**: `prisma/dev.db` (auto-created, not in git)
- **Access**: Run `npx prisma studio` for web GUI
- **Schema**: See `prisma/schema.prisma`

### Seeded data:
- 6 rooms (2 junior, 3 king, 1 presidential)
- Room IDs: `room-001` through `room-006`

### API Examples
```bash
# Check room availability
curl "http://localhost:3000/api/rooms/available?checkIn=2024-12-01&checkOut=2024-12-03&guests=2&type=king"

# Create reservation
curl -X POST "http://localhost:3000/api/reservations" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{"roomId":"room-003","type":"king","checkIn":"2024-12-01","checkOut":"2024-12-03","guests":2,"breakfast":true}'
```

---

## API Documentation

### GET /api/rooms/available

**Purpose:** Query available rooms with dynamic pricing

**Query Parameters:**
- `checkIn` (required): Check-in date (YYYY-MM-DD)
- `checkOut` (required): Check-out date (YYYY-MM-DD)  
- `guests` (required): Number of guests (1-10)
- `type` (optional): Room type (junior|king|presidential)
- `breakfast` (optional): Include breakfast pricing (boolean)
- `breakdown` (optional): Include price breakdown (boolean)

**Example Request:**
```bash
curl "http://localhost:3000/api/rooms/available?checkIn=2024-12-01&checkOut=2024-12-03&guests=2&type=king&breakfast=true&breakdown=true"
```

**Example Response:**
```json
{
  "items": [
    {
      "roomId": "room-003",
      "type": "king", 
      "capacity": 3,
      "baseRateCents": 9000,
      "pricing": {
        "totalCents": 24500,
        "pricePerNightCents": 12250,
        "nights": 2,
        "currency": "USD",
        "breakdown": [
          {
            "date": "2024-11-30",
            "baseCents": 9000,
            "weekendUpliftCents": 2250,
            "lengthDiscountCents": 0,
            "breakfastCents": 1000,
            "subtotalCents": 12250
          }
        ]
      }
    }
  ],
  "paging": {
    "limit": 20,
    "nextCursor": null
  }
}
```

### POST /api/reservations

**Purpose:** Create a new hotel reservation

**Required Headers:**
- `Content-Type: application/json`
- `Idempotency-Key: <unique-key>` (prevents duplicate bookings)

**Request Body:**
```json
{
  "roomId": "room-003",
  "type": "king",
  "checkIn": "2024-12-01", 
  "checkOut": "2024-12-03",
  "guests": 2,
  "breakfast": true
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/reservations" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: booking-12345" \
  -d '{"roomId":"room-003","type":"king","checkIn":"2024-12-01","checkOut":"2024-12-03","guests":2,"breakfast":true}'
```

**Success Response (201):**
```json
{
  "id": "res-booking-mghbrvhz",
  "roomId": "room-003",
  "type": "king",
  "guests": 2,
  "breakfast": true,
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-03", 
  "status": "CONFIRMED",
  "createdAt": "2025-10-08T01:43:48.791Z",
  "pricing": {
    "totalCents": 24500,
    "nights": 2,
    "currency": "USD",
    "breakdown": [...]
  },
  "requestIdempotencyKey": "booking-12345"
}
```

**Error Scenarios:**
- `400` - Missing Idempotency-Key header
- `404` - Room not found or not available  
- `409` - Room already booked for those dates
- `422` - Invalid date range or business rule violation

### POST /api/ai/query

**Purpose:** AI-powered natural language query processing for hotel search

**Request Body:**
```json
{
  "query": "Find a king room for 2 guests under $200 with breakfast"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/ai/query" \
  -H "Content-Type: application/json" \
  -d '{"query":"Show me luxury suites with breakfast for a week in December"}'
```

**Success Response (200):**
```json
{
  "natural_language_response": "We found 3 luxury suites with breakfast available for your December stay. Top options include...",
  "structured_results": [ ... ],
  "extracted_parameters": {
    "check_in_date": "2025-12-01",
    "check_out_date": "2025-12-08",
    "num_guests": 2,
    "room_type": "luxury",
    "breakfast_included": true
  }
}
```

**Error Scenarios:**
- `400` - Invalid query format
- `404` - No rooms found matching criteria
- `500` - AI processing error

---

## AI Query Endpoint (Ollama Integration)

This project supports natural language hotel search using an AI-powered endpoint via Ollama.

### How it works
- The `/api/ai/query` endpoint accepts a user query (e.g., "Find a king room for 2 guests under $200 with breakfast").
- The backend uses Ollama (LLM) to extract booking parameters from the query.
- It finds available rooms matching those parameters.
- Ollama generates a friendly, natural language response summarizing the results.

### Example Request
```json
POST /api/ai/query
{
  "query": "Show me luxury suites with breakfast for a week in December"
}
```

### Example Response
```json
{
  "natural_language_response": "We found 3 luxury suites with breakfast available for your December stay. Top options include...",
  "structured_results": [ ... ],
  "extracted_parameters": {
    "check_in_date": "2025-12-01",
    "check_out_date": "2025-12-08",
    "num_guests": 2,
    "room_type": "luxury",
    "breakfast_included": true
  }
}
```

### Setup
1. Install Ollama (see docs/technology-stack-justification.md)
2. Pull a recommended model (e.g., `ollama pull llama3.2:3b`)
3. Start Ollama server (`ollama serve`)
4. Run the backend and POST to `/api/ai/query`

### Reference
See `src/domain/services/query-processor.ts` for the main logic.

---

## Development Commands

```bash
# Installation
npm install

# Development
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm run start        # Start production server

# Testing  
npm test            # Run test suite
npm run test:watch  # Run tests in watch mode

# Code Quality
npm run lint        # ESLint code analysis
npm run format      # Prettier code formatting
npm run type-check  # TypeScript compilation check
```
---

*For a detailed explanation of the hexagonal architecture, see [docs/RFC-001-Architecture.md](docs/RFC-001-Architecture.md).*
