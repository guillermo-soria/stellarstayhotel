import { Request, Response } from "express";
import { reliabilityManager } from "../../../infrastructure/reliability/reliability-manager";

export async function healthController(_req: Request, res: Response) {
  try {
    const startTime = Date.now();
    
    // Get reliability metrics
    const reliabilityMetrics = reliabilityManager.getMetrics();
    const circuitBreakerStates = reliabilityManager.getCircuitBreakerStates();
    
    // Basic health check - service is running
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        service: "healthy",
        reliability: {
          metrics: reliabilityMetrics,
          circuitBreakers: circuitBreakerStates
        }
      }
    };

    const responseTime = Date.now() - startTime;
    
    // Health check should be fast (<50ms per RFC)
    if (responseTime > 50) {
      console.warn(`Health check slow: ${responseTime}ms`);
    }

    return res.json(health);
  } catch {
    return res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Health check failed"
    });
  }
}

export async function readyController(_req: Request, res: Response) {
  try {
    const startTime = Date.now();
    
    // Readiness check - basic checks without external dependencies
    const checks = {
      memory: "unknown",
      process: "healthy",
      reliability: "healthy"
    };

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    checks.memory = memUsageMB < 200 ? "healthy" : "warning"; // 200MB threshold

    // Check circuit breakers - if any are open, mark as degraded
    const circuitBreakerStates = reliabilityManager.getCircuitBreakerStates();
    const hasOpenCircuitBreakers = circuitBreakerStates.some(state => state.state === 'OPEN');
    checks.reliability = hasOpenCircuitBreakers ? "degraded" : "healthy";

    const allHealthy = Object.values(checks).every(status => status === "healthy");
    const responseTime = Date.now() - startTime;

    const readiness = {
      status: allHealthy ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      checks: {
        ...checks,
        memoryUsageMB: memUsageMB,
        circuitBreakers: circuitBreakerStates
      }
    };

    return res.status(allHealthy ? 200 : 503).json(readiness);
  } catch {
    return res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      error: "Readiness check failed"
    });
  }
}
