import { Request, Response } from "express";

export async function healthController(_req: Request, res: Response) {
  try {
    const startTime = Date.now();
    
    // Basic health check - service is running
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        service: "healthy"
      }
    };

    const responseTime = Date.now() - startTime;
    
    // Health check should be fast (<50ms per RFC)
    if (responseTime > 50) {
      console.warn(`Health check slow: ${responseTime}ms`);
    }

    return res.json(health);
  } catch (error) {
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
      process: "healthy"
    };

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    checks.memory = memUsageMB < 200 ? "healthy" : "warning"; // 200MB threshold

    const allHealthy = Object.values(checks).every(status => status === "healthy");
    const responseTime = Date.now() - startTime;

    const readiness = {
      status: allHealthy ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      checks: {
        ...checks,
        memoryUsageMB: memUsageMB
      }
    };

    return res.status(allHealthy ? 200 : 503).json(readiness);
  } catch (error) {
    return res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      error: "Readiness check failed"
    });
  }
}
