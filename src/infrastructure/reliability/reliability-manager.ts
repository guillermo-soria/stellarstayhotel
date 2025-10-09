import { ReliabilityPatterns, SimpleCircuitBreaker, DEFAULT_RELIABILITY_CONFIG, ReliabilityConfig } from './patterns';
import { logger } from '../logger';

export interface OperationMetrics {
  operationName: string;
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  averageLatencyMs: number;
  lastExecuted: Date;
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  nextAttempt: number;
  serviceName: string;
}

/**
 * Centralized reliability management service
 * Handles retry policies, timeouts, and circuit breakers for all operations
 */
export class ReliabilityManager {
  private patterns: ReliabilityPatterns;
  private circuitBreakers = new Map<string, SimpleCircuitBreaker>();
  private metrics = new Map<string, OperationMetrics>();

  constructor(private config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG) {
    this.patterns = new ReliabilityPatterns(config);
    logger.info('ReliabilityManager initialized');
  }

  /**
   * Execute operation with retry and timeout
   */
  async executeWithReliability<T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: {
      timeoutMs?: number;
      maxRetries?: number;
      useCircuitBreaker?: boolean;
    }
  ): Promise<T> {
    const startTime = Date.now();
    const timeoutMs = options?.timeoutMs ?? this.getTimeoutForOperation(operationName);
    
    try {
      let result: T;

      // Wrap with circuit breaker if requested
      if (options?.useCircuitBreaker) {
        const circuitBreaker = this.getOrCreateCircuitBreaker(operationName);
        result = await circuitBreaker.execute(async () => {
          return await this.executeWithRetryAndTimeout(operation, operationName, timeoutMs, options?.maxRetries);
        });
      } else {
        result = await this.executeWithRetryAndTimeout(operation, operationName, timeoutMs, options?.maxRetries);
      }

      // Record success metrics
      this.recordSuccess(operationName, Date.now() - startTime);
      return result;

    } catch (error) {
      // Record failure metrics
      this.recordFailure(operationName, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Execute room search with appropriate reliability patterns
   */
  async executeRoomSearch<T>(operation: () => Promise<T>): Promise<T> {
    return this.executeWithReliability(operation, 'room-search', {
      timeoutMs: this.config.timeouts.roomSearchMs,
      maxRetries: 2,
      useCircuitBreaker: false // Room search is local, no need for circuit breaker
    });
  }

  /**
   * Execute reservation creation with appropriate reliability patterns
   */
  async executeReservationCreation<T>(operation: () => Promise<T>): Promise<T> {
    return this.executeWithReliability(operation, 'reservation-creation', {
      timeoutMs: this.config.timeouts.reservationMs,
      maxRetries: 1, // Be conservative with reservation creation
      useCircuitBreaker: false
    });
  }

  /**
   * Execute pricing calculation with appropriate reliability patterns
   */
  async executePricingCalculation<T>(operation: () => Promise<T>): Promise<T> {
    return this.executeWithReliability(operation, 'pricing-calculation', {
      timeoutMs: this.config.timeouts.pricingMs,
      maxRetries: 3,
      useCircuitBreaker: false
    });
  }

  /**
   * Execute external service call with circuit breaker
   */
  async executeExternalServiceCall<T>(
    operation: () => Promise<T>,
    serviceName: string,
    timeoutMs?: number
  ): Promise<T> {
    return this.executeWithReliability(operation, serviceName, {
      timeoutMs: timeoutMs ?? this.config.timeouts.defaultMs,
      maxRetries: this.config.retries.maxAttempts,
      useCircuitBreaker: true
    });
  }

  /**
   * Get current reliability metrics for monitoring
   */
  getMetrics(): OperationMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get circuit breaker states for monitoring
   */
  getCircuitBreakerStates(): ({ name: string } & CircuitBreakerState)[] {
    const states: ({ name: string } & CircuitBreakerState)[] = [];
    this.circuitBreakers.forEach((breaker, name) => {
      const state = breaker.getState() as CircuitBreakerState;
      states.push({ name, ...state });
    });
    return states;
  }

  private async executeWithRetryAndTimeout<T>(
    operation: () => Promise<T>,
    operationName: string,
    timeoutMs: number,
    maxRetries?: number
  ): Promise<T> {
    const wrappedOperation = () => 
      this.patterns.withTimeout(operation, timeoutMs, operationName);

    return this.patterns.withRetry(wrappedOperation, operationName, {
      maxRetries: maxRetries
    });
  }

  private getTimeoutForOperation(operationName: string): number {
    switch (operationName) {
      case 'room-search':
        return this.config.timeouts.roomSearchMs;
      case 'reservation-creation':
        return this.config.timeouts.reservationMs;
      case 'pricing-calculation':
        return this.config.timeouts.pricingMs;
      default:
        return this.config.timeouts.defaultMs;
    }
  }

  private getOrCreateCircuitBreaker(serviceName: string): SimpleCircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const breakerConfig = {
        failureThreshold: this.config.circuitBreaker.failureThreshold,
        timeout: this.config.circuitBreaker.timeoutMs,
        monitoringPeriod: this.config.circuitBreaker.monitoringPeriodMs
      };
      const breaker = new SimpleCircuitBreaker(breakerConfig, serviceName);
      this.circuitBreakers.set(serviceName, breaker);
      logger.info(`Created circuit breaker for service: ${serviceName}`);
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  private recordSuccess(operationName: string, latencyMs: number) {
    const existing = this.metrics.get(operationName);
    if (existing) {
      existing.totalAttempts++;
      existing.successCount++;
      existing.averageLatencyMs = (existing.averageLatencyMs + latencyMs) / 2;
      existing.lastExecuted = new Date();
    } else {
      this.metrics.set(operationName, {
        operationName,
        totalAttempts: 1,
        successCount: 1,
        failureCount: 0,
        averageLatencyMs: latencyMs,
        lastExecuted: new Date()
      });
    }
  }

  private recordFailure(operationName: string, latencyMs: number) {
    const existing = this.metrics.get(operationName);
    if (existing) {
      existing.totalAttempts++;
      existing.failureCount++;
      existing.averageLatencyMs = (existing.averageLatencyMs + latencyMs) / 2;
      existing.lastExecuted = new Date();
    } else {
      this.metrics.set(operationName, {
        operationName,
        totalAttempts: 1,
        successCount: 0,
        failureCount: 1,
        averageLatencyMs: latencyMs,
        lastExecuted: new Date()
      });
    }
  }
}

// Singleton instance for global use
export const reliabilityManager = new ReliabilityManager();
