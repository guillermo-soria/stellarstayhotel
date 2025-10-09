import "dotenv/config";
import { z } from "zod";

/**
 * Validate and normalize environment variables at startup.
 * Fail fast if something critical is missing or malformed.
 */
const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Will be required once Prisma/DB is wired. For now keep it optional.
  DATABASE_URL: z.string().optional(),

  // Idempotency cache TTL (seconds)
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().min(60).default(86400),

  // Cache TTL (seconds)
  CACHE_TTL_SECONDS: z.coerce.number().int().min(10).default(90),

  // Readiness memory thresholds (MB)
  READINESS_MEMORY_WARNING_MB: z.coerce.number().int().min(50).default(200),
  READINESS_MEMORY_CRITICAL_MB: z.coerce.number().int().min(100).default(500),

  // Redis connection string (optional)
  REDIS_URL: z.string().optional(),
}).refine((val) => val.READINESS_MEMORY_CRITICAL_MB > val.READINESS_MEMORY_WARNING_MB, {
  message: "READINESS_MEMORY_CRITICAL_MB must be greater than READINESS_MEMORY_WARNING_MB",
  path: ["READINESS_MEMORY_CRITICAL_MB"],
});

export const env = (() => {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Show a clean error and abort startup (fail fast)
    const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    console.error("[ENV] Invalid environment configuration:", issues);
    process.exit(1);
  }
  return parsed.data;
})();
