# RFC-001: Hexagonal Architecture for StellarStay Hotel Backend

## Summary
This RFC proposes the adoption of Hexagonal Architecture (Ports and Adapters) for the StellarStay hotel backend, enabling clear separation of concerns, testability, and flexibility for integrating external systems such as LLMs (Ollama), databases, and APIs.

## Motivation
- Decouple business logic from infrastructure and delivery mechanisms.
- Facilitate maintainability and scalability.
- Enable easy integration of new adapters (e.g., payment, AI, messaging).
- Improve testability by isolating domain logic behind ports.

## Architecture Overview
The system is organized into three main layers:

- **Domain Layer:** Core business logic and entities (e.g., ReservationService, PricingEngine).
- **Application Layer:** Use cases and primary ports (e.g., CreateReservationPort).
- **Infrastructure Layer:** Adapters implementing ports (e.g., HTTPReservationAdapter, PrismaReservationRepository).

### Ports
- **Primary Ports:** Interfaces for incoming requests (use cases).
- **Secondary Ports:** Interfaces for outgoing dependencies (repositories, external services).

### Diagram
See [`hexagonal-architecture.mmd`](../hexagonal-architecture.mmd) for a visual representation using Mermaid.

## 🧭 Trade-offs and Future Improvements

### 1. Synchronous Simplicity vs Asynchronous Scalability
**Trade-off:**  
The current design favors simplicity — all operations (e.g., creating a reservation, calculating price) are executed synchronously within a single request/response flow.  
While easy to debug, this introduces:
- Higher response latency perceived by users.  
- Direct coupling with external services (email, analytics).  
- Risk of cascading failures if any secondary operation fails.

**Future improvement:**  
Adopt an **event-driven architecture** using a Message Bus (e.g., RabbitMQ, SQS, Redis Streams).  
Publish events like `reservation.created` or `payment.authorized` to decouple core workflows and improve scalability and resilience.

---

### 2. Transactional Consistency vs Eventual Consistency
**Trade-off:**  
Current implementation relies on ACID transactions for immediate consistency.  
This ensures atomicity but limits scalability and cross-service coordination.

**Future improvement:**  
Implement the **Outbox + Event Dispatcher pattern**, storing events within the same database transaction as business data.  
A background dispatcher can then publish those events, guaranteeing **at-least-once delivery** without losing transactional integrity.

---

### 3. Direct Coupling vs Loose Coupling
**Trade-off:**  
Controllers currently depend directly on downstream services for notifications and side-effects.

**Future improvement:**  
Introduce **ports and adapters** for messaging and notifications (e.g., `MessageBus` interface).  
Provide multiple implementations — `InMemoryBus` for tests, `RabbitBus` for production — keeping the domain independent from infrastructure.

---

### 4. In-Memory Cache vs Distributed Cache
**Trade-off:**  
The system uses an in-memory cache for availability and pricing data, which is fast but not shared across instances.  
This limits horizontal scalability and consistency.

**Future improvement:**  
Adopt **Redis** as a distributed cache with configurable TTLs and cache invalidation policies.  
Add metrics for hit ratio, and ensure fallback to persistent data in case of cache failure.

---

### 5. Limited Observability
**Trade-off:**  
Logging and monitoring are currently minimal and depend on runtime outputs.

**Future improvement:**  
Enhance **observability** with:
- Metrics (latency, throughput, error rate).  
- **Trace IDs** and **event IDs** to follow end-to-end workflows.  
- Alerts on consumer or outbox dispatcher failures.  

This will support more reliable debugging and proactive monitoring.

---

### 6. Static Pricing Rules
**Trade-off:**  
Pricing rules are deterministic and hard-coded, providing limited flexibility.

**Future improvement:**  
Implement an **AI-powered pricing engine** (LLM-based adapter) to dynamically adjust rates based on demand, seasonality, and booking trends.  
Expose the output as an event (`price.quoted`) for traceability and potential analytics integration.

---

### 7. Manual Testing vs Automated Reliability
**Trade-off:**  
Reliability is currently validated via unit and integration tests only.

**Future improvement:**  
Add:
- **Resilience tests** simulating timeouts and service failures.  
- **Exponential backoff retries** and **Dead Letter Queues (DLQ)** for event consumers.  
- **Chaos tests** to validate system recovery under stress.

---

### 8. Future Roadmap (Incremental Evolution)

| Iteration | Improvement | Benefit |
|------------|-------------|----------|
| v2.0 | Event-driven architecture + Outbox pattern | Decoupled and resilient workflows |
| v2.1 | Redis distributed cache | Horizontal scalability and consistency |
| v2.2 | Observability and metrics layer | Monitoring and reliability |
| v2.3 | RabbitMQ adapter | Real asynchronous communication |
| v3.0 | AI-powered pricing engine | Smart dynamic pricing |

---
## Example Flow
1. An HTTP request is received by an adapter.
2. The adapter calls a primary port (use case).
3. The use case interacts with domain services/entities.
4. Domain services use secondary ports to access repositories or external services.

## References
- [README.md](../README.md)
- [hexagonal-architecture.mmd](../hexagonal-architecture.mmd)

