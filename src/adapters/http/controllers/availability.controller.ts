import { Request, Response, NextFunction } from "express";
import type { AvailabilityQuery } from "../schemas/availability.schema";

export async function getAvailableRoomsController(req: Request, res: Response, next: NextFunction) {
  try {
    // Already validated & coerced by middleware
    const q = req.query as unknown as AvailabilityQuery;

    return res.json({
      items: [],
      paging: { limit: 20, nextCursor: null },
      query: q,
    });
  } catch (err) {
    return next(err);
  }
}
