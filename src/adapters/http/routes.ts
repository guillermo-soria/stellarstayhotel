import { Router } from "express";
import { healthController } from "./controllers/health.controller";
import { getAvailableRoomsController } from "./controllers/availability.controller";
import { createReservationController } from "./controllers/reservations.controller";

export const router = Router();

router.get("/health", healthController);
router.get("/api/rooms/available", getAvailableRoomsController);
router.post("/api/reservations", createReservationController);
