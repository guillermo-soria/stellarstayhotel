import { RetryPolicy, TimeoutManager, CircuitBreaker } from './types';

export class ReliabilityPatterns {
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryPolicy = {
      maxRetries: 3,
      baseDelay: 200,
      backoffMultiplier: 2,
      maxDelay: 5000,
      jitter: true
    }
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on 4xx errors (client errors)
        if (this.isClientError(error)) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === config.maxRetries) {
          break;
        }
        
        const delay = this.calculateDelay(attempt, config);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  static withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      })
    ]);
  }

  private static isClientError(error: any): boolean {
    // Check if it's an HTTP client error (4xx)
    return error?.status >= 400 && error?.status < 500;
  }

  private static calculateDelay(attempt: number, config: RetryPolicy): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    
    if (config.jitter) {
      // Add ±25% jitter
      const jitterAmount = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.min(delay, config.maxDelay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit Breaker implementation
export class SimpleCircuitBreaker {
  private failures = 0;
  private nextAttempt = Date.now();
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private config: {
      failureThreshold: number;
      timeout: number;
      monitoringPeriod: number;
    }
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
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
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.timeout;
    }
  }
}
