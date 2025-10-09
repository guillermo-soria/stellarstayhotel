import { env } from '../../../src/infrastructure/config/env';
import { z } from 'zod';

describe('env config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should load defaults when env vars are missing', () => {
    process.env = {};
    process.env.LOG_LEVEL = undefined;
    jest.resetModules();
    const { PORT, LOG_LEVEL, NODE_ENV, IDEMPOTENCY_TTL_SECONDS, CACHE_TTL_SECONDS, READINESS_MEMORY_WARNING_MB, READINESS_MEMORY_CRITICAL_MB } = require('../../../src/infrastructure/config/env').env;
    expect(PORT).toBe(3000);
    expect(LOG_LEVEL).toBe('info');
    expect(NODE_ENV).toBe('development');
    expect(IDEMPOTENCY_TTL_SECONDS).toBe(86400);
    expect(CACHE_TTL_SECONDS).toBe(90);
    expect(READINESS_MEMORY_WARNING_MB).toBe(200);
    expect(READINESS_MEMORY_CRITICAL_MB).toBe(500);
  });

  it('should fail if critical threshold is not greater than warning', () => {
    process.env.READINESS_MEMORY_WARNING_MB = '500';
    process.env.READINESS_MEMORY_CRITICAL_MB = '200';
    // Should exit process, so we mock exit
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    expect(() => require('../../../src/infrastructure/config/env')).toThrow('exit');
    exitSpy.mockRestore();
  });

  it('should parse valid custom values', () => {
    process.env.PORT = '8080';
    process.env.LOG_LEVEL = 'debug';
    process.env.NODE_ENV = 'production';
    process.env.IDEMPOTENCY_TTL_SECONDS = '120';
    process.env.CACHE_TTL_SECONDS = '30';
    process.env.READINESS_MEMORY_WARNING_MB = '100';
    process.env.READINESS_MEMORY_CRITICAL_MB = '200';
    const envConfig = require('../../../src/infrastructure/config/env').env;
    expect(envConfig.PORT).toBe(8080);
    expect(envConfig.LOG_LEVEL).toBe('debug');
    expect(envConfig.NODE_ENV).toBe('production');
    expect(envConfig.IDEMPOTENCY_TTL_SECONDS).toBe(120);
    expect(envConfig.CACHE_TTL_SECONDS).toBe(30);
    expect(envConfig.READINESS_MEMORY_WARNING_MB).toBe(100);
    expect(envConfig.READINESS_MEMORY_CRITICAL_MB).toBe(200);
  });
});
