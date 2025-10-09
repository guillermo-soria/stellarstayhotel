import { ZodObject, ZodError, ZodRawShape, TypeOf } from "zod";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../../infrastructure/errors/app-error";

export type Part = "query" | "body" | "params" | "headers";

// Augment Express Request with typed validated fields (optional generic use)
declare module 'express-serve-static-core' {
  interface Request {
    validatedQuery?: unknown;
    validatedBody?: unknown;
    validatedParams?: unknown;
    validatedHeaders?: unknown;
  }
}

export function validate<T extends ZodRawShape>(part: Part, schema: ZodObject<T>) {
  type Parsed = TypeOf<typeof schema>;
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      let source: unknown;
      switch (part) {
        case 'query': source = req.query; break;
        case 'body': source = req.body; break;
        case 'params': source = req.params; break;
        case 'headers': source = req.headers; break;
      }
      const parsed: Parsed = schema.parse(source);

      switch (part) {
        case 'query':
          req.validatedQuery = parsed;
          break;
        case 'body':
          req.validatedBody = parsed;
          break;
        case 'params':
          req.validatedParams = parsed;
          break;
        case 'headers':
          req.validatedHeaders = parsed;
          break;
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new AppError({
          code: 'INVALID_INPUT',
          status: 400,
          message: 'Validation error',
          details: err.issues.map(i => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          }))
        }));
      }
      return next(err);
    }
  };
}
