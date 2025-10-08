import { ZodObject, ZodError, ZodRawShape } from "zod";
import { Request, Response, NextFunction } from "express";

type Part = "query" | "body" | "params" | "headers";

// Extend Request type to include validated data
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: any;
      validatedBody?: any;
      validatedParams?: any;
      validatedHeaders?: any;
    }
  }
}

export function validate<T extends ZodRawShape>(part: Part, schema: ZodObject<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[part]);
      
      // Store validated data in a separate property
      if (part === 'query') req.validatedQuery = parsed;
      else if (part === 'body') req.validatedBody = parsed;
      else if (part === 'params') req.validatedParams = parsed;
      else if (part === 'headers') req.validatedHeaders = parsed;
      
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const e: any = new Error("Validation error");
        e.statusCode = 400;
        e.code = "INVALID_INPUT";
        e.details = err.issues.map(i => ({
          path: i.path.join("."),
          message: i.message,
          code: i.code,
        }));
        return next(e);
      }
      return next(err);
    }
  };
}
