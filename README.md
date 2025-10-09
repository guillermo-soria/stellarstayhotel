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
# Generate Prisma client and run migrations
npx prisma migrate dev

# Seed the database with initial room data
npx prisma db seed
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

# RFC-001 — StellarStay Hotels System Architecture

## 1. Executive Summary & Requirements

### Problem Statement
StellarStay Hotels requires a scalable reservation system to handle growth from 1,000 to 50,000+ bookings/day while maintaining 99.9% uptime during peak periods. The system must support complex dynamic pricing rules and multiple external integrations.

### Proposed Architectural Approach  
**Hexagonal Architecture** with clear domain boundaries, implementing:
- Clean separation between business logic and infrastructure
- Port-based interfaces for external dependencies
- Adapter pattern for technology-specific implementations
- Stateless design enabling horizontal scaling

### Key Requirements
- **Scalability:** Handle 50x traffic growth with horizontal scaling
- **Reliability:** 99.9% uptime with proper error handling and retries
- **Business Logic:** Complex pricing rules with deterministic application
- **Data Consistency:** Prevent double-booking and maintain inventory accuracy
- **Performance:** Sub-200ms response times for availability queries

### Success Metrics
- **Availability:** 99.9% uptime during peak periods
- **Throughput:** 50,000+ bookings/day capacity
- **Latency:** <200ms for availability queries, <500ms for reservations
- **Accuracy:** 100% pricing calculation correctness
- **Reliability:** <0.1% error rate with proper retry handling

## 2. System Architecture (Hexagonal Design)

### 2.1 Service Architecture

#### Core Services with Hexagonal Boundaries

**Reservation Service (Primary Focus)**
- **Core Responsibilities:**
  - Booking lifecycle management
  - Business rule validation (capacity, dates, pricing)
  - Idempotency handling
  - Reservation state management

- **Primary Ports (Incoming):**
  - `CreateReservationPort` - Booking creation interface
  - `QueryReservationPort` - Reservation lookup interface

- **Secondary Ports (Outgoing):**
  - `ReservationRepoPort` - Persistence interface
  - `RoomRepoPort` - Room availability interface  
  - `PricingEnginePort` - Price calculation interface
  - `PaymentPort` - Payment processing interface (stubbed)

- **Key Adapters:**
  - `HTTPReservationAdapter` - REST API endpoints
  - `InMemoryReservationRepository` - Development persistence
  - `PrismaReservationRepository` - Production persistence

**Room Service**
- **Core Responsibilities:**
  - Room inventory management
  - Availability calculation
  - Room type and capacity validation

- **Primary Ports:**
  - `RoomAvailabilityPort` - Availability query interface

- **Secondary Ports:**
  - `RoomRepoPort` - Room data persistence
  - `ReservationRepoPort` - Conflict checking

- **Key Adapters:**
  - `HTTPRoomAdapter` - REST availability endpoint
  - `InMemoryRoomRepository` - Development storage

**Pricing Service**
- **Core Responsibilities:**
  - Dynamic price calculation
  - Business rule application (weekend, length, breakfast)
  - Price breakdown generation

- **Primary Ports:**
  - `PricingCalculationPort` - Price quote interface

- **Secondary Ports:**
  - `ConfigurationPort` - Pricing rules configuration

- **Key Adapters:**
  - `PricingEngine` - Core calculation logic
  - `ConfigurationAdapter` - Rules management

### 2.2 Communication Architecture

#### Synchronous Communication Patterns

**REST API Design:**
```
GET  /api/rooms/available    - Room availability with pricing
POST /api/reservations       - Create new reservation  
GET  /health                 - Service health check
GET  /ready                  - Service readiness check
```

**Request/Response Flow:**
1. **Input Validation** - Zod schema validation at API boundary
2. **Use Case Execution** - Business logic in application layer
3. **Domain Processing** - Core business rules in domain layer
4. **Data Persistence** - Repository pattern for data access
5. **Response Formatting** - Consistent JSON structure

**Error Handling Strategy:**
- `400 Bad Request` - Invalid input parameters
- `404 Not Found` - Room or reservation not found
- `409 Conflict` - Room unavailable or booking conflict
- `422 Unprocessable Entity` - Business rule violations
- `500 Internal Server Error` - System failures with retry capability

**Performance Requirements:**
- Availability queries: <200ms p95 latency
- Reservation creation: <500ms p95 latency  
- Health checks: <50ms response time
- Concurrent request handling: 1000+ requests/second

## 3. Scalability & Reliability Strategy

### 3.1 Scalability Design

**Horizontal Scaling Approach:**
- Stateless application design enables load balancer distribution
- Shared-nothing architecture between application instances
- Database connection pooling for efficient resource utilization
- Container-based deployment for easy scaling

**Database Scaling Strategy:**
- Read replicas for availability queries (eventual consistency acceptable)
- Write operations to primary database (strong consistency required)
- Database per service pattern for service independence
- Partitioning by hotel/region for large-scale deployments

**Caching Strategy:**
- Redis for hot availability data (5-minute TTL)
- In-memory caching for pricing rules and room configurations
- Cache invalidation on inventory updates
- Cache-aside pattern for read-heavy operations

**Load Balancing:**
- Round-robin distribution for stateless requests
- Health check integration for automatic failover
- Session affinity not required due to stateless design

### 3.2 Reliability Patterns

**Retry Policies (REQUIRED):**
```typescript
// Exponential backoff with jitter
const retryConfig = {
  baseDelay: 200, // ms
  maxRetries: 3,
  backoffMultiplier: 2,
  maxDelay: 5000, // ms
  jitter: true
};

// Never retry 4xx errors (client errors)
// Retry 5xx errors and network timeouts
```

**Timeout Management:**
- HTTP request timeout: 30 seconds
- Database operation timeout: 10 seconds  
- External service timeout: 15 seconds
- Overall request timeout: 60 seconds

**Health Monitoring:**
- `/health` endpoint for liveness checks
- `/ready` endpoint for readiness verification
- Database connectivity verification
- External service dependency checks

**Circuit Breaker (Optional):**
- Payment service circuit breaker (30% failure threshold)
- AI service circuit breaker (50% failure threshold)
- Automatic recovery after 60-second cooldown

## 4. Data Architecture

### Database Per Service Design
- **Reservation Database:** Booking data and transaction history
- **Room Database:** Inventory and room configurations  
- **Pricing Database:** Rules and rate configurations

### Data Consistency Patterns
- **Strong Consistency:** Reservation creation and inventory updates
- **Eventual Consistency:** Availability queries and pricing calculations
- **Optimistic Locking:** Conflict resolution for concurrent bookings

### Performance Optimization
- **Indexing Strategy:** Date ranges, room types, and availability status
- **Query Optimization:** Efficient availability lookups with proper joins
- **Connection Pooling:** Maximum 20 connections per service instance

## 5. Technology Stack Justification

### Programming Language: **Node.js + TypeScript**
**Justification:**
- Strong ecosystem for web APIs and microservices
- Excellent async/await support for I/O operations
- TypeScript provides compile-time safety and better tooling
- Large talent pool and extensive library support

### Framework: **Express.js**
**Justification:**
- Lightweight and flexible for REST API development
- Excellent middleware ecosystem for cross-cutting concerns
- Easy integration with validation and error handling
- Production-proven for high-traffic applications

### Databases: **PostgreSQL (Production) + SQLite (Development)**
**Justification:**
- PostgreSQL: ACID compliance, JSON support, excellent performance
- SQLite: Zero-configuration development environment
- Prisma ORM: Type-safe database access with migration support

### Validation: **Zod**
**Justification:**
- Runtime type validation with TypeScript integration
- Excellent error messages for API consumers
- Schema-first approach with OpenAPI generation capability

### Infrastructure: **Docker + Docker Compose**
**Justification:**
- Consistent development and production environments
- Easy local setup with dependency management
- Container orchestration ready for cloud deployment

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

---

## Architecture Summary

### Key Design Decisions

1. **Hexagonal Architecture:** Clean separation enables independent testing and technology swapping
2. **Shared Repository Instances:** Prevents race conditions and ensures data consistency  
3. **Dynamic Pricing Engine:** Centralized business logic with deterministic rule application
4. **Stateless Design:** Enables horizontal scaling and simplified deployment
5. **Comprehensive Validation:** Input validation at API boundary with business validation in domain

### Implementation Validates Design

Our implementation successfully demonstrates:
- **Port/Adapter Pattern:** Clear interfaces between layers
- **Business Logic Isolation:** PricingEngine independent of HTTP concerns
- **Error Handling:** Proper HTTP status codes with meaningful error messages
- **Data Consistency:** Shared repositories prevent double-booking scenarios
- **Scalability:** Stateless controllers ready for load balancer distribution

### Trade-offs and Future Improvements

**Current Trade-offs:**
- In-memory storage limits persistence (addressed by Prisma integration path)
- Single-service deployment (architecture ready for service splitting)
- Synchronous processing (async patterns available for high-volume scenarios)

**Future Improvements:**
1. **Database Integration:** PostgreSQL with Prisma for production persistence
2. **Observability:** Metrics, distributed tracing, and structured logging
3. **Advanced Reliability:** Circuit breakers and bulkhead isolation
4. **Performance:** Redis caching and read replicas
5. **AI Integration:** Natural language query processing with Ollama

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

*This implementation successfully validates the RFC design through working code that solves real StellarStay business problems while demonstrating proper hexagonal architecture patterns.*

- [2025-10-09] Health/Readiness endpoint now performs a real DB ping using Prisma ($queryRaw). Response includes `db` status ("healthy" or "unreachable").
- Prisma client output changed to dist/generated/prisma for compatibility with compiled code.
- If DB is unreachable, readiness status is "not_ready" and `checks.db` reflects the error.