import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const ReservationBody = z.object({
  roomId: z.string(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1),
  breakfast: z.boolean().default(false),
});

export async function createReservationController(req: Request, res: Response, next: NextFunction) {
  try {
    const idem = req.header("Idempotency-Key");
    if (!idem) {
      const e: any = new Error("Missing Idempotency-Key header");
      e.statusCode = 400; e.code = "MISSING_IDEMPOTENCY_KEY";
      throw e;
    }

    const body = ReservationBody.parse(req.body);
    // Stub: call use-case later
    return res.status(201).json({
      id: "res_stub",
      status: "CONFIRMED",
      currency: "USD",
      requestIdempotencyKey: idem,
      echo: body
    });
  } catch (err) {
    (err as any).statusCode ||= 400;
    (err as any).code ||= "INVALID_BODY";
    return next(err);
  }
}
