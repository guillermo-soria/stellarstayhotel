# RFC-001 — StellarStay Hotels

**Author:** Guillermo Soria  
**Date:** 2025-10-07  
**Status:** Draft

## 1. Executive Summary

StellarStay requires a scalable and reliable hotel reservation platform with dynamic pricing and external integrations (payments). The system must handle growth from ~1k to 50k+ bookings/day while maintaining 99.9% uptime.

This RFC proposes a hexagonal (ports & adapters) architecture, stateless processing, strict input validation and error mapping, and optional AI integration (Ollama) for natural-language queries.

Day 2 will validate this design by implementing Option A:
- `GET /api/rooms/available`
- `POST /api/reservations`

## 2. Goals / Non-Goals

### Goals

- Scalability through stateless design, horizontal scaling, and caching.
- Reliability via timeouts, retries (exponential backoff), idempotency, and health/readiness checks.
- Clear hexagonal boundaries between domain, ports, and adapters.
- Pricing engine implementing StellarStay's pricing rules in a deterministic order.
- Single source of truth for API schemas using Zod, with OpenAPI generation via zod-to-openapi (to avoid Swagger duplication).

### Non-Goals

- Full multi-service deployment (validated through a single "Booking API" that respects hexagonal boundaries).
- Full payment orchestration (stubbed port unless required).
- Complex async/event-driven features (optional bonus only).

## 3. Functional Scope (Day 2 Validation)

### Option A

- `GET /api/rooms/available?checkIn&checkOut&guests&type?`
- `POST /api/reservations` (requires Idempotency-Key header)

### Optional Bonus:
- `POST /api/ai/query` — Natural-language room search powered by Ollama.

## 4. Architecture Overview (Hexagonal)

**Domain:** Core entities (Room, Inventory, Reservation), PricingEngine, and availability rules.

**Application / Use Cases:** GetAvailableRooms, CreateReservation.

**Ports:**
- **Primary:** HTTP controllers.
- **Secondary:** RoomRepoPort, ReservationRepoPort, PaymentPort (stub), CachePort (optional), AIModelPort (bonus).

**Adapters:**
- HTTP (Express)
- DB (Prisma → SQLite for development, PostgreSQL for production)
- Cache (Redis, optional)
- Payment (HTTP client stub)
- AI (Ollama HTTP adapter, optional)

## 5. Communication & Error Handling

REST (synchronous) with strict request validation (Zod).

**Error mapping:**
- `400` – Invalid input
- `404` – Not found
- `409` – Conflict (no availability or duplicate booking)
- `422` – Business rule violation
- `5xx` – Internal or upstream error

**Timeouts:** enforced per request and per dependency.

**Idempotency:** Idempotency-Key for POST /api/reservations.

## 6. Scalability & Reliability Strategy

### Scalability

- Stateless services behind a load balancer.
- Database scaling via read replicas and partitioning by hotel/region (future).
- Caching (Redis) for hot reads (availability, pricing).
- Pagination for listing endpoints.

### Reliability

- Retry with exponential backoff for transient failures (never retry 4xx).
- Optional circuit breaker around payment/AI services.
- `/health` (liveness) and `/ready` (readiness) endpoints.
- Structured logging (Pino) with request correlation IDs.
- Metrics for latency, error rates, and retry counts.

**Retry template:** Base delay 200 ms × 2^attempt, max 3 tries, jitter, bounded by overall timeout.

## 7. Data Architecture

Single database for Day 2 (conceptually DB-per-service).

**Entities:**
- `Room(id, type [junior|king|presidential], capacity, baseRate)`
- `Inventory(roomId, date, available)`
- `Reservation(id, roomId, dateRange, guests, breakfast, total, status)`

**Consistency:** strong for reservation commits, eventual for derived reads.

**Migrations:** versioned (Prisma Migrate).

## 8. Pricing Rules (Order of Application)

1. **Base rate per room type per day:**
   - Junior $60, King $90, Presidential $150.

2. **Weekend uplift:** +25% on Saturdays/Sundays (per-night basis).

3. **Length discounts:** applied per day after weekend uplift:
   - 4–6 days: −$4/day
   - 7–9 days: −$8/day
   - 10+ days: −$12/day

4. **Breakfast option:** +$5 per guest per day.

5. **Final total** rounded to two decimals.

## 9. Technology Stack

- **Language/Runtime:** Node.js 18 + TypeScript
- **Framework:** Express
- **Validation:** Zod + zod-to-openapi (for OpenAPI generation later)
- **Logging:** Pino (structured JSON)
- **HTTP client:** undici or axios (with timeouts and retries)
- **ORM/Database:** Prisma (SQLite for development, PostgreSQL for production)
- **Cache:** Redis (optional)
- **Containerization:** Docker + docker-compose
- **AI Integration (bonus):** Ollama via HTTP adapter

## 10. Implementation Plan (Day 2)

1. Bootstrap minimal project (folders, Express, Pino, Zod).
2. Implement PricingEngine and date utilities.
3. Implement use cases (GetAvailableRooms, CreateReservation) and corresponding ports.
4. Create adapters: Prisma repositories, HTTP controllers, and logger integration.
5. Add reliability patterns: timeouts, retries (where applicable), idempotency.
6. Write unit tests (pricing engine) and minimal E2E happy-path tests for both endpoints.
7. Provide a clear README with setup steps and Docker instructions.
8. Later: generate OpenAPI spec from Zod schemas using zod-to-openapi.

## 11. Open Questions and Assumptions

| # | Question | Assumption if not clarified |
|---|----------|----------------------------|
| **1** | What is the **overbooking policy** if multiple users reserve the last available room at the same time? | Reject subsequent attempts with **409 Conflict** (first confirmed wins). |
| **2** | How should **weekend pricing** be applied when a stay spans multiple weekends? | Apply the +25% uplift **only to nights** that fall on Saturday/Sunday. |
| **3** | Are **length-based discounts** applied to every night once the threshold is reached, or only to extra nights? | Apply to **all nights** once the threshold tier is reached. |
| **4** | How is **time and timezone** handled for date ranges? | All dates are treated as **UTC**, ISO-8601 format (`YYYY-MM-DD`), without time components. |
| **5** | Should **breakfast** charges apply to all guests and all nights when enabled? | Yes — apply `+5 * guests * nights` when `breakfast = true`. |
| **6** | How far in advance can users search for availability, and what is the maximum stay length? | Maximum search window of **30 nights**; reject longer stays with `422 Unprocessable Entity`. |
| **7** | What is the retention and scope of the **Idempotency-Key** header? | Cache responses for **24 hours**; key is unique per endpoint and consumer. |
| **8** | What is the expected **currency and tax policy**? | Use **USD**, tax-exclusive pricing for simplicity. |
| **9** | Should the service provide **partial availability** (e.g., some but not all nights)? | No — reservations must have continuous availability for the full date range. |
| **10** | Is **AI integration (Ollama)** mandatory or purely bonus? | It is optional (bonus) — the system must function fully without it. |
