import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// Minimal schema for query validation 
const AvailabilityQuery = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1),
  type: z.enum(["junior", "king", "presidential"]).optional(),
});

export async function getAvailableRoomsController(req: Request, res: Response, next: NextFunction) {
  try {
    const q = AvailabilityQuery.parse(req.query);
    // Stub response for now
    return res.json({
      items: [],
      paging: { limit: 20, nextCursor: null },
      query: q
    });
  } catch (err) {
    (err as any).statusCode = 400;
    (err as any).code = "INVALID_QUERY";
    return next(err);
  }
}
