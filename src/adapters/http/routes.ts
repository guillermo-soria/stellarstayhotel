import { Router } from "express";
import { healthController, readyController } from "./controllers/health.controller";
import { getAvailableRoomsController } from "./controllers/availability.controller";
import { createReservationController } from "./controllers/reservations.controller";
import { newCreateReservationController } from "./controllers/new-reservations.controller";
import { validate } from "./validate";
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

// New implementation for testing
router.post(
  "/api/v2/reservations",
  validate("body", ReservationBody),
  newCreateReservationController
);
