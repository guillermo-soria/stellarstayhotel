import { ZodObject, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

type Part = "query" | "body" | "params" | "headers";

export function validate<T>(part: Part, schema: ZodObject<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[part as keyof Request]);
      
      // Use Object.defineProperty to safely set the parsed values
      Object.defineProperty(req, part, {
        value: parsed,
        writable: true,
        enumerable: true,
        configurable: true
      });
      
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
