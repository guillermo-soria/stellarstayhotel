// Mock reliability manager
const mockReliabilityManager = {
  getMetrics: jest.fn().mockReturnValue([]),
  getCircuitBreakerStates: jest.fn().mockReturnValue([])
};

jest.mock('../../../src/infrastructure/reliability/reliability-manager', () => ({
  reliabilityManager: mockReliabilityManager
}));

import { healthController, readyController } from '../../../src/adapters/http/controllers/health.controller';
import { Request, Response } from 'express';

describe('Health Controllers', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {};
    
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy.mockRestore();
  });

  describe('healthController', () => {
    it('should return healthy status', async () => {
      const beforeCall = Date.now();

      await healthController(
        mockRequest as Request,
        mockResponse as Response
      );

      const afterCall = Date.now();

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          checks: {
            service: 'healthy',
            reliability: expect.objectContaining({
              metrics: expect.any(Array),
              circuitBreakers: expect.any(Array)
            })
          }
        })
      );

      // Verify timestamp is recent
      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const responseTime = new Date(response.timestamp).getTime();
      expect(responseTime).toBeGreaterThanOrEqual(beforeCall);
      expect(responseTime).toBeLessThanOrEqual(afterCall);
    });

    it('should include uptime information', async () => {
      const originalUptime = process.uptime();

      await healthController(
        mockRequest as Request,
        mockResponse as Response
      );

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response.uptime).toBeGreaterThanOrEqual(originalUptime);
      expect(response.uptime).toBeLessThanOrEqual(originalUptime + 1); // Should be very close
    });

    it('should warn if health check is slow', async () => {
      // Mock Date.now to simulate slow health check
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        if (callCount === 0) {
          callCount++;
          return 1000; // Start time
        }
        return 1060; // End time (60ms later, > 50ms threshold)
      });

      await healthController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith('Health check slow: 60ms');

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should not warn if health check is fast', async () => {
      await healthController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock process.uptime to throw an error
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => {
        throw new Error('Test error');
      });

      await healthController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        timestamp: expect.any(String),
        error: 'Health check failed'
      });

      // Restore original uptime
      process.uptime = originalUptime;
    });
  });

  describe('readyController', () => {
    let originalMemoryUsage: typeof process.memoryUsage;

    beforeEach(() => {
      originalMemoryUsage = process.memoryUsage;
    });

    afterEach(() => {
      process.memoryUsage = originalMemoryUsage;
    });

    it('should return ready status with healthy memory usage', async () => {
      // Mock memory usage to be low
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 200 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 150 * 1024 * 1024
      });

      await readyController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          timestamp: expect.any(String),
          responseTime: expect.stringMatching(/^\d+ms$/),
          checks: expect.objectContaining({
            memory: 'healthy',
            process: 'healthy',
            reliability: 'healthy',
            memoryUsageMB: 100,
            circuitBreakers: expect.any(Array)
          })
        })
      );
    });

    it('should return not_ready status with high memory usage', async () => {
      // Mock memory usage to be high
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        heapUsed: 250 * 1024 * 1024, // 250MB (> 200MB threshold)
        heapTotal: 300 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 300 * 1024 * 1024
      });

      await readyController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          timestamp: expect.any(String),
          responseTime: expect.stringMatching(/^\d+ms$/),
          checks: expect.objectContaining({
            memory: 'warning',
            process: 'healthy',
            memoryUsageMB: 250
          })
        })
      );
    });

    it('should include accurate response time', async () => {
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 75 * 1024 * 1024
      });

      const beforeCall = Date.now();

      await readyController(
        mockRequest as Request,
        mockResponse as Response
      );

      const afterCall = Date.now();
      const maxExpectedTime = afterCall - beforeCall + 1; // Add 1ms buffer

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const responseTimeValue = parseInt(response.responseTime.replace('ms', ''));
      
      expect(responseTimeValue).toBeGreaterThanOrEqual(0);
      expect(responseTimeValue).toBeLessThanOrEqual(maxExpectedTime);
    });

    it('should handle errors gracefully', async () => {
      // Mock memoryUsage to throw an error
      (process.memoryUsage as any) = jest.fn(() => {
        throw new Error('Memory check failed');
      });

      await readyController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'not_ready',
        timestamp: expect.any(String),
        error: 'Readiness check failed'
      });
    });

    it('should handle edge case: exactly at memory threshold', async () => {
      // Mock memory usage to be exactly at threshold
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        heapUsed: 200 * 1024 * 1024, // Exactly 200MB
        heapTotal: 250 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 225 * 1024 * 1024
      });

      await readyController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          checks: expect.objectContaining({
            memory: 'warning',
            memoryUsageMB: 200
          })
        })
      );
    });
  });
});
