import { Request, Response, NextFunction } from "express";

export async function createReservationController(req: Request, res: Response, next: NextFunction) {
  try {
    const idem = req.header("Idempotency-Key");
    if (!idem) {
      const e: any = new Error("Missing Idempotency-Key header");
      e.statusCode = 400; e.code = "MISSING_IDEMPOTENCY_KEY";
      throw e;
    }

    // req.validatedBody contains data validated & coerced by Zod
    const body = req.validatedBody as {
      roomId: string; type: "junior"|"king"|"presidential";
      checkIn: string; checkOut: string; guests: number; breakfast: boolean;
    };

    // TODO: call use case, e.g.:
    // const out = await createReservation.execute(mappedInput);

    return res.status(201).json({
      id: "res_stub",
      status: "CONFIRMED",
      currency: "USD",
      requestIdempotencyKey: idem,
      echo: body
    });
  } catch (err) {
    return next(err);
  }
}
