import { PrismaRoomRepository } from "./repositories/prisma-room.repository";
import { PrismaReservationRepository } from "./repositories/prisma-reservation.repository";
import { PricingEngine } from "../domain/services/pricing-engine";
import { GetAvailableRooms } from "../application/use-cases/get-available-rooms";
import { CreateReservation } from "../application/use-cases/create-reservation";

// Shared instances (singletons for Prisma repositories)
export const reservationRepo = new PrismaReservationRepository();
export const roomRepo = new PrismaRoomRepository();
export const pricingEngine = new PricingEngine();

// Use cases with shared dependencies
export const getAvailableRooms = new GetAvailableRooms(roomRepo, pricingEngine);
export const createReservation = new CreateReservation(reservationRepo);