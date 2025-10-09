import { Request, Response, NextFunction } from "express";
import type { AvailabilityQuery } from "../schemas/availability.schema";
import { getAvailableRooms } from '../../../infrastructure/container';
import { reliabilityManager } from '../../../infrastructure/reliability/reliability-manager';

// Initialize dependencies

export async function getAvailableRoomsController(req: Request, res: Response, next: NextFunction) {
  try {
    // Get validated data from middleware
    const query = req.validatedQuery as AvailabilityQuery;

    // Execute use case with reliability patterns (retry, timeout)
    const rooms = await reliabilityManager.executeWithReliability(
      () => getAvailableRooms.execute({
        dateRange: {
          checkIn: query.checkIn,
          checkOut: query.checkOut,
        },
        guests: query.guests,
        type: query.type,
        breakfast: query.breakfast,
        includeBreakdown: query.breakdown,
      }),
      'get-available-rooms',
      { maxRetries: 3, timeoutMs: 5000, useCircuitBreaker: true }
    );

    // Transform to API response format
    const response = {
      items: rooms.map((room) => ({
        roomId: room.roomId,
        type: room.type,
        capacity: room.capacity,
        baseRateCents: room.baseRate,
        pricing: {
          totalCents: room.totalCents,
          pricePerNightCents: room.priceCentsPerNight,
          nights: room.nights,
          currency: "USD",
          breakdown: room.breakdown,
        },
      })),
      paging: {
        limit: 20,
        nextCursor: null, // TODO: Implement actual pagination
      },
      query: {
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        guests: query.guests,
        type: query.type,
        breakfast: query.breakfast,
      },
    };

    return res.json(response);
  } catch (err) {
    return next(err);
  }
}
