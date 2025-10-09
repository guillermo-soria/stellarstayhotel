import { ReliabilityManager } from '../../../src/infrastructure/reliability/reliability-manager';
import * as PatternsModule from '../../../src/infrastructure/reliability/patterns';

const mockWithTimeout = jest.fn((op, ms, name) => op());
const mockWithRetry = jest.fn((op, name, opts) => op());
const mockExecute = jest.fn(async (fn) => fn());
type CircuitBreakerState = {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  nextAttempt: number;
  serviceName: string;
};

const mockGetState = jest.fn((): CircuitBreakerState => ({ state: 'CLOSED', failures: 0, nextAttempt: Date.now(), serviceName: 'test-service' }));

beforeEach(() => {
  jest.spyOn(PatternsModule.ReliabilityPatterns.prototype, 'withTimeout').mockImplementation(mockWithTimeout);
  jest.spyOn(PatternsModule.ReliabilityPatterns.prototype, 'withRetry').mockImplementation(mockWithRetry);
  jest.spyOn(PatternsModule.SimpleCircuitBreaker.prototype, 'execute').mockImplementation(mockExecute);
  jest.spyOn(PatternsModule.SimpleCircuitBreaker.prototype, 'getState').mockImplementation(mockGetState);
  jest.clearAllMocks();
});

describe('ReliabilityManager', () => {
  it('should execute operation with reliability (success)', async () => {
    const manager = new ReliabilityManager();
    const result = await manager.executeWithReliability(async () => 'ok', 'test-op');
    expect(result).toBe('ok');
    expect(mockWithTimeout).toHaveBeenCalled();
    expect(mockWithRetry).toHaveBeenCalled();
  });

  it('should record failure metrics', async () => {
    const manager = new ReliabilityManager();
    await expect(manager.executeWithReliability(async () => { throw new Error('fail'); }, 'fail-op')).rejects.toThrow('fail');
    const metrics = manager.getMetrics().find(m => m.operationName === 'fail-op');
    expect(metrics?.failureCount).toBe(1);
  });

  it('should use circuit breaker for external service', async () => {
    const manager = new ReliabilityManager();
    const result = await manager.executeExternalServiceCall(async () => 'cb-ok', 'external-service');
    expect(result).toBe('cb-ok');
    expect(mockExecute).toHaveBeenCalled();
  });

  it('should return circuit breaker states', async () => {
    const manager = new ReliabilityManager();
    await manager.executeExternalServiceCall(async () => 'cb-ok', 'external-service');
    const states = manager.getCircuitBreakerStates();
    expect(states[0].state).toBe('CLOSED');
    expect(states[0].serviceName).toBe('test-service');
  });

  it('should use correct timeouts for named operations', async () => {
    const manager = new ReliabilityManager({
      timeouts: { roomSearchMs: 123, reservationMs: 456, pricingMs: 789, defaultMs: 111 },
      retries: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 2, backoffMultiplier: 2, jitter: false },
      circuitBreaker: { failureThreshold: 2, timeoutMs: 1000, monitoringPeriodMs: 1000 }
    });
    await manager.executeRoomSearch(async () => 'room');
    expect(mockWithTimeout).toHaveBeenCalledWith(expect.any(Function), 123, 'room-search');
    await manager.executeReservationCreation(async () => 'res');
    expect(mockWithTimeout).toHaveBeenCalledWith(expect.any(Function), 456, 'reservation-creation');
    await manager.executePricingCalculation(async () => 'price');
    expect(mockWithTimeout).toHaveBeenCalledWith(expect.any(Function), 789, 'pricing-calculation');
  });

  it('should handle edge case: metrics for unknown operation', () => {
    const manager = new ReliabilityManager();
    manager['recordSuccess']('unknown', 10);
    const metrics = manager.getMetrics().find(m => m.operationName === 'unknown');
    expect(metrics?.successCount).toBe(1);
  });
});
