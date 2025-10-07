import { Router } from "express";
import { healthController } from "./controllers/health.controller";
import { readyController } from "./controllers/ready.controller";
import { getAvailableRoomsController } from "./controllers/availability.controller";
import { createReservationController } from "./controllers/reservations.controller";
import { validate } from "./validate";
import { AvailabilityQuery } from "./schemas/availability.schema";
import { ReservationBody } from "./schemas/reservation.schema";
import { AvailabilityQuerySchema } from "./schemas/availability.schema";


export const router = Router();

router.get("/health", healthController);
router.get("/ready", readyController);
router.get(
  "/api/rooms/available",
  validate("query", AvailabilityQuerySchema),
  getAvailableRoomsController
);

router.post(
  "/api/reservations",
  validate("body", ReservationBody),
  createReservationController
);
