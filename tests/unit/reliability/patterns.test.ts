import { ReliabilityPatterns, DEFAULT_RELIABILITY_CONFIG, SimpleCircuitBreaker } from '../../../src/infrastructure/reliability/patterns';

describe('ReliabilityPatterns', () => {
  const reliability = new ReliabilityPatterns();

  it('should succeed withRetry on first attempt', async () => {
    const result = await reliability.withRetry(async () => 'ok', 'test-success');
    expect(result).toBe('ok');
  });

  it('should retry and eventually succeed', async () => {
    let attempts = 0;
    const result = await reliability.withRetry(async () => {
      attempts++;
      if (attempts < 2) throw new Error('fail');
      return 'ok';
    }, 'test-retry');
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('should throw after max retries', async () => {
    await expect(
      reliability.withRetry(async () => { throw new Error('fail'); }, 'test-max-retries', { maxRetries: 1 })
    ).rejects.toThrow('fail');
  });

  it('should not retry on client error (4xx)', async () => {
    await expect(
      reliability.withRetry(async () => { throw { status: 404, message: 'Not found' }; }, 'test-client-error')
    ).rejects.toMatchObject({ status: 404 });
  });

  it('should timeout long operation', async () => {
    await expect(
      reliability.withTimeout(() => new Promise(res => setTimeout(() => res('done'), 100)), 10, 'test-timeout')
    ).rejects.toThrow(/timed out/);
  });

  it('should succeed if operation is fast enough', async () => {
    const result = await reliability.withTimeout(() => Promise.resolve('fast'), 1000, 'test-fast');
    expect(result).toBe('fast');
  });
});

describe('SimpleCircuitBreaker', () => {
  const config = { failureThreshold: 2, timeout: 100, monitoringPeriod: 100 };
  let breaker: SimpleCircuitBreaker;

  beforeEach(() => {
    breaker = new SimpleCircuitBreaker(config, 'test-service');
  });

  it('should execute when closed', async () => {
    const result = await breaker.execute(async () => 'ok');
    expect(result).toBe('ok');
    expect(breaker.getState().state).toBe('CLOSED');
  });

  it('should open after failures and block execution', async () => {
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    expect(breaker.getState().state).toBe('OPEN');
    await expect(breaker.execute(async () => 'ok')).rejects.toThrow(/Circuit breaker is OPEN/);
  });

  it('should half-open after timeout and recover', async () => {
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    expect(breaker.getState().state).toBe('OPEN');
    // Simula el paso del tiempo
    (breaker as any).nextAttempt = Date.now() - 1;
    const result = await breaker.execute(async () => 'ok');
    expect(result).toBe('ok');
    expect(breaker.getState().state).toBe('CLOSED');
  });
});
