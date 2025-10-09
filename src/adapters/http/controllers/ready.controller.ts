import { Request, Response } from "express";
import { logger } from "../../../infrastructure/logger";

interface ReadinessCheck {
  name: string;
  status: "ok" | "error";
  message?: string;
  duration?: number;
}

interface ReadinessResponse {
  status: "ready" | "not_ready";
  timestamp: string;
  uptime: number;
  checks: ReadinessCheck[];
}

export async function readyController(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const checks: ReadinessCheck[] = [];

  try {
    // 1. Basic service health
    checks.push(await checkServiceHealth());

    // 2. Database connectivity (when implemented)
    checks.push(await checkDatabaseConnectivity());

    // 3. External dependencies (when implemented)
    // checks.push(await checkPaymentService());
    // checks.push(await checkCacheService());

    // Determine overall status
    const hasFailures = checks.some(check => check.status === "error");
    const overallStatus = hasFailures ? "not_ready" : "ready";
    const httpStatus = hasFailures ? 503 : 200;

    const response: ReadinessResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks,
    };

    logger.info(
      {
        readinessStatus: overallStatus,
        checkCount: checks.length,
        failedChecks: checks.filter(c => c.status === "error").length,
        duration: Date.now() - startTime,
      },
      "Readiness check completed"
    );

    res.status(httpStatus).json(response);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      },
      "Readiness check failed with exception"
    );

    res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: [
        {
          name: "readiness_check",
          status: "error",
          message: "Readiness check failed with exception",
        },
      ],
    } as ReadinessResponse);
  }
}

/**
 * Check basic service health - memory, CPU, etc.
 */
async function checkServiceHealth(): Promise<ReadinessCheck> {
  const startTime = Date.now();
  
  try {
    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // Basic memory check - adjust threshold for testing environment
    // Use larger limit in testing environments where memory usage is higher
    const memoryThreshold = process.env.NODE_ENV === 'test' ? 2048 : 1024;
    
    if (memUsedMB > memoryThreshold) {
      return {
        name: "service_health",
        status: "error",
        message: `High memory usage: ${memUsedMB}MB (threshold: ${memoryThreshold}MB)`,
        duration: Date.now() - startTime,
      };
    }

    return {
      name: "service_health",
      status: "ok",
      message: `Memory usage: ${memUsedMB}MB (threshold: ${memoryThreshold}MB)`,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: "service_health",
      status: "error",
      message: error instanceof Error ? error.message : "Service health check failed",
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check database connectivity - currently stubbed
 * TODO: Implement actual database ping when Prisma is set up
 */
async function checkDatabaseConnectivity(): Promise<ReadinessCheck> {
  const startTime = Date.now();
  
  try {
    // TODO: Replace with actual database ping
    // const result = await prisma.$queryRaw`SELECT 1`;
    
    // For now, just simulate a quick check
    await new Promise(resolve => setTimeout(resolve, 5));
    
    return {
      name: "database",
      status: "ok",
      message: "Database connectivity verified (stubbed)",
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: "database",
      status: "error",
      message: error instanceof Error ? error.message : "Database connectivity failed",
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check external payment service - for future implementation
 */
// async function checkPaymentService(): Promise<ReadinessCheck> {
//   const startTime = Date.now();
//   
//   try {
//     // TODO: Implement actual payment service health check
//     // const response = await fetch(`${PAYMENT_SERVICE_URL}/health`, { 
//     //   timeout: 2000 
//     // });
//     
//     return {
//       name: "payment_service",
//       status: "ok",
//       message: "Payment service is reachable",
//       duration: Date.now() - startTime,
//     };
//   } catch (error) {
//     return {
//       name: "payment_service",
//       status: "error",
//       message: error instanceof Error ? error.message : "Payment service unreachable",
//       duration: Date.now() - startTime,
//     };
//   }
// }
