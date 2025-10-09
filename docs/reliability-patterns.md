# Reliability Patterns Implementation

This document describes the reliability patterns implemented in the StellarStay Hotels backend system.

## Overview

The system implements several reliability patterns to ensure robust operation:

- **Retry Policies** with exponential backoff
- **Timeout Management** for operations
- **Circuit Breakers** for external services
- **Health Monitoring** with metrics collection

## Architecture

### ReliabilityManager

The `ReliabilityManager` is a centralized service that coordinates all reliability patterns:

```typescript
import { reliabilityManager } from '../infrastructure/reliability/reliability-manager';

// Execute with retry, timeout, and optional circuit breaker
const result = await reliabilityManager.executeWithReliability(
  () => someOperation(),
  'operation-name',
  {
    maxRetries: 3,
    timeoutMs: 5000,
    useCircuitBreaker: true
  }
);
```

### Configuration

Default configuration is provided but can be customized:

```typescript
const config = {
  retries: {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 5000,
    backoffFactor: 2
  },
  timeouts: {
    defaultMs: 5000,
    roomSearchMs: 3000,
    reservationMs: 7000,
    pricingMs: 2000
  },
  circuitBreaker: {
    maxFailures: 5,
    resetTimeoutMs: 60000
  }
};
```

## Usage Examples

### API Controllers

#### Availability Controller
```typescript
const rooms = await reliabilityManager.executeWithReliability(
  () => getAvailableRooms.execute({...params}),
  'get-available-rooms',
  {
    maxRetries: 3,
    timeoutMs: 5000,
    useCircuitBreaker: true
  }
);
```

#### Reservations Controller
```typescript
const result = await reliabilityManager.executeWithReliability(
  () => createReservation.execute({...params}),
  'create-reservation',
  {
    maxRetries: 2, // Fewer retries for mutations
    timeoutMs: 7000,
    useCircuitBreaker: true
  }
);
```

### External Service Calls
```typescript
const response = await reliabilityManager.executeExternalServiceCall(
  () => httpClient.get('/external-api'),
  'external-service',
  10000 // 10 second timeout
);
```

## Monitoring and Health Checks

### Metrics Collection

The system automatically collects metrics for all operations:

```typescript
const metrics = reliabilityManager.getMetrics();
// Returns: OperationMetrics[]
// {
//   operationName: string,
//   totalAttempts: number,
//   successCount: number,
//   failureCount: number,
//   averageLatencyMs: number,
//   lastExecuted: Date
// }
```

### Circuit Breaker States

Monitor circuit breaker health:

```typescript
const states = reliabilityManager.getCircuitBreakerStates();
// Returns array of:
// {
//   name: string,
//   state: 'OPEN' | 'CLOSED' | 'HALF_OPEN',
//   failures: number,
//   nextAttempt: number,
//   serviceName: string
// }
```

### Health Endpoints

#### `/health`
Basic health check with reliability metrics:
```json
{
  "status": "ok",
  "timestamp": "2025-10-08T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "service": "healthy",
    "reliability": {
      "metrics": [...],
      "circuitBreakers": [...]
    }
  }
}
```

#### `/ready`
Readiness check including circuit breaker states:
```json
{
  "status": "ready",
  "timestamp": "2025-10-08T10:30:00.000Z",
  "responseTime": "2ms",
  "checks": {
    "memory": "healthy",
    "process": "healthy",
    "reliability": "healthy",
    "memoryUsageMB": 85,
    "circuitBreakers": [...]
  }
}
```

## Features

### Retry Policies
- **Exponential Backoff**: Increasing delays between retries
- **Jitter**: Randomization to prevent thundering herd
- **Configurable**: Max attempts, base delay, backoff factor
- **Error Classification**: Retryable vs non-retryable errors

### Timeout Management
- **Operation-specific timeouts**: Different timeouts for different operations
- **Graceful handling**: Clean error responses on timeout
- **Monitoring**: Timeout events are logged and tracked

### Circuit Breakers
- **Fail-fast behavior**: When service is down, fail immediately
- **Automatic recovery**: Half-open state for testing recovery
- **Configurable thresholds**: Failure count and reset timeout
- **Per-service isolation**: Each external service has its own breaker

### Health Monitoring
- **Metrics collection**: Performance and reliability metrics
- **Circuit breaker monitoring**: Real-time state information
- **Memory usage**: System resource monitoring
- **Response time tracking**: Performance monitoring

## Error Handling

The system handles various error scenarios:

- **Transient failures**: Automatic retry with backoff
- **Timeout errors**: Clean timeout handling
- **Circuit breaker trips**: Fail-fast when service is down
- **Non-retryable errors**: Immediate failure for business logic errors

## Best Practices

1. **Choose appropriate retry counts**: More for reads, fewer for mutations
2. **Set reasonable timeouts**: Balance responsiveness vs success rate
3. **Monitor circuit breakers**: Alert when breakers are open
4. **Use retryable error classification**: Don't retry business logic errors
5. **Track metrics**: Monitor success rates and latencies

## Integration

The reliability patterns are integrated into:
- ✅ Availability Controller (room search)
- ✅ Reservations Controller (reservation creation)
- ✅ Health Monitoring (metrics and circuit breaker states)

## Future Enhancements

- Rate limiting patterns
- Bulkhead isolation
- Advanced monitoring and alerting
- Distributed tracing integration
