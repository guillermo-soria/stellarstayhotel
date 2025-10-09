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

## Example Flow
1. An HTTP request is received by an adapter.
2. The adapter calls a primary port (use case).
3. The use case interacts with domain services/entities.
4. Domain services use secondary ports to access repositories or external services.

## References
- [README.md](../README.md)
- [hexagonal-architecture.mmd](../hexagonal-architecture.mmd)

## Status
Accepted

## Success Criteria

- **Architectural Thinking:** Demonstrates deep understanding of the hotel business domain and technical challenges (scalability, reliability, pricing, integrations).
- **Design Coherence:** All architectural decisions (layering, ports/adapters, separation of concerns) work together to achieve maintainability, scalability, and testability.
- **Pattern Mastery:** Hexagonal architecture and reliability patterns (retry, circuit breaker, error handling) are correctly and consistently applied throughout the design and implementation.
- **Practical Validation:** The implementation validates the RFC by solving real business requirements, passing all tests, and achieving the documented goals (uptime, performance, correctness).
