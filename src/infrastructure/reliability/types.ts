export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
  jitter: boolean;
}

export interface TimeoutConfig {
  httpRequestTimeout: number;
  databaseTimeout: number;
  externalServiceTimeout: number;
  overallRequestTimeout: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  monitoringPeriod: number;
}

export interface TimeoutManager {
  withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T>;
}

export interface CircuitBreaker {
  execute<T>(operation: () => Promise<T>): Promise<T>;
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
