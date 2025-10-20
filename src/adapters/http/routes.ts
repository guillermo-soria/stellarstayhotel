import { Router } from "express";
import { healthController, readyController } from "./controllers/health.controller";
import { getAvailableRoomsController } from "./controllers/availability.controller";
import { createReservationController } from "./controllers/reservations.controller";
import aiRouter from "./ai.controller";
import { validate } from "./validate";
import { ReservationBody } from "./schemas/reservation.schema";
import { AvailabilityQuerySchema } from "./schemas/availability.schema";


export const router = Router();

router.get("/health", healthController);
router.get("/ready", readyController);
// Mount AI routes (POST /api/ai/query)
router.use(aiRouter);
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

// Backwards-compatible aliases for older/openapi paths that pointed to /api/rooms/*
router.post(
  "/api/rooms/reservations",
  validate("body", ReservationBody),
  createReservationController
);

router.post(
  "/api/rooms/book",
  validate("body", ReservationBody),
  createReservationController
);
