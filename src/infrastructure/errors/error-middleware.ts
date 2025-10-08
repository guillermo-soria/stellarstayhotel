import { NextFunction, Request, Response } from "express";

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.statusCode ?? 500;
  const code = err.code ?? "INTERNAL_ERROR";
  const message = err.message ?? "Internal server error";
  const details = err.details;

  res.status(status).json({ error: { code, message, details } });
}
