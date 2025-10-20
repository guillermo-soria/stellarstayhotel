import { RetryPolicy } from './types';
import { logger } from '../logger';

export interface ReliabilityConfig {
  retries: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitter: boolean;
  };
  timeouts: {
    defaultMs: number;
    roomSearchMs: number;
    reservationMs: number;
    pricingMs: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    timeoutMs: number;
    monitoringPeriodMs: number;
  };
}

export const DEFAULT_RELIABILITY_CONFIG: ReliabilityConfig = {
  retries: {
    maxAttempts: 3,
    baseDelayMs: 200,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitter: true
  },
  timeouts: {
    defaultMs: 30000,
    roomSearchMs: 10000,
    reservationMs: 15000,
    pricingMs: 5000
  },
  circuitBreaker: {
    failureThreshold: 5,
    timeoutMs: 60000,
    monitoringPeriodMs: 30000
  }
};

export class ReliabilityPatterns {
  constructor(private config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG) {}

  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryPolicy>
  ): Promise<T> {
    const retryConfig = {
      maxRetries: customConfig?.maxRetries ?? this.config.retries.maxAttempts,
      baseDelay: customConfig?.baseDelay ?? this.config.retries.baseDelayMs,
      backoffMultiplier: customConfig?.backoffMultiplier ?? this.config.retries.backoffMultiplier,
      maxDelay: customConfig?.maxDelay ?? this.config.retries.maxDelayMs,
      jitter: customConfig?.jitter ?? this.config.retries.jitter
    };

    let lastError: Error;
    const startTime = Date.now();
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        logger.debug(`${operationName}: Attempt ${attempt + 1}/${retryConfig.maxRetries + 1}`);
        const result = await operation();
        
        if (attempt > 0) {
          logger.info(`${operationName}: Succeeded after ${attempt + 1} attempts in ${Date.now() - startTime}ms`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        logger.warn(`${operationName}: Attempt ${attempt + 1} failed: ${lastError.message}`);
        
        // Don't retry on 4xx errors (client errors)
        if (this.isClientError(error)) {
          logger.debug(`${operationName}: Not retrying client error (4xx)`);
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === retryConfig.maxRetries) {
          logger.error(`${operationName}: All ${retryConfig.maxRetries + 1} attempts failed`);
          break;
        }
        
        const delay = this.calculateDelay(attempt, retryConfig);
        logger.debug(`${operationName}: Waiting ${delay}ms before retry`);
        await this.sleep(delay);
      }
    }
    
    // Log final failure with metrics
    const totalTime = Date.now() - startTime;
    logger.error(`${operationName}: Failed after ${retryConfig.maxRetries + 1} attempts in ${totalTime}ms`);
    throw lastError!;
  }

  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string,
    timeoutMessage?: string
  ): Promise<T> {
    const defaultMessage = `${operationName} timed out after ${timeoutMs}ms`;
    
    // Ensure the timeout timer is cleared when the operation settles.
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        logger.warn(`Timeout: ${defaultMessage}`);
        reject(new Error(timeoutMessage ?? defaultMessage));
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private isClientError(e: unknown): e is { status: number } {
    if (typeof e !== 'object' || e === null) return false;
    const maybe = e as { status?: unknown };
    return typeof maybe.status === 'number' && maybe.status >= 400 && maybe.status < 500;
  }

  private calculateDelay(attempt: number, config: RetryPolicy): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    
    if (config.jitter) {
      // Add ±25% jitter
      const jitterAmount = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.min(delay, config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit Breaker implementation
export class SimpleCircuitBreaker {
  private failures = 0;
  private nextAttempt = Date.now();
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime = 0;

  constructor(
    private config: {
      failureThreshold: number;
      timeout: number;
      monitoringPeriod: number;
    },
    private serviceName = 'unknown-service'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const timeUntilRetry = Math.round((this.nextAttempt - Date.now()) / 1000);
        logger.warn(`Circuit breaker OPEN for ${this.serviceName}. Retry in ${timeUntilRetry}s`);
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`);
      }
      this.state = 'HALF_OPEN';
      logger.info(`Circuit breaker HALF_OPEN for ${this.serviceName} - trying one request`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    if (this.state !== 'CLOSED') {
      logger.info(`Circuit breaker CLOSED for ${this.serviceName} - service recovered`);
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.timeout;
      
      const retryTime = new Date(this.nextAttempt).toISOString();
      logger.error(
        `Circuit breaker OPEN for ${this.serviceName} after ${this.failures} failures. ` +
        `Will retry at ${retryTime}`
      );
    } else {
      logger.warn(
        `Circuit breaker failure ${this.failures}/${this.config.failureThreshold} for ${this.serviceName}`
      );
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.nextAttempt,
      serviceName: this.serviceName
    };
  }
}
