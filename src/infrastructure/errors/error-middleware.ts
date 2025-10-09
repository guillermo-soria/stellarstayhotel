import { NextFunction, Request, Response } from "express";
import { isAppError } from "./app-error";

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isAppError(err)) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  const unexpected = err as Error | undefined;
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: unexpected?.message ?? 'Internal server error'
    }
  });
}
