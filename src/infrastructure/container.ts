import { InMemoryCache, globalInMemoryCache } from './cache/in-memory.cache';
import { CachedRoomRepository } from './repositories/cached-room.repository';
import { PrismaReservationRepository } from './repositories/prisma-reservation.repository';
import { PrismaRoomRepository } from './repositories/prisma-room.repository';
import { PricingEngine } from "../domain/services/pricing-engine";
import { GetAvailableRooms } from "../application/use-cases/get-available-rooms";
import { CreateReservation } from "../application/use-cases/new-create-reservation";
import { env } from './config/env';
import { RedisCache } from './cache/redis.cache';

let availabilityGlobalVersion = 0;
PrismaReservationRepository.onAvailabilityInvalidated = () => { availabilityGlobalVersion++; };
export const availabilityVersionProvider = () => availabilityGlobalVersion;

const baseRoomRepo = new PrismaRoomRepository();
export const inMemoryCache = globalInMemoryCache; // export to access stats

// Selección dinámica de backend de caché
const cacheBackend = env.REDIS_URL
  ? new RedisCache(env.CACHE_TTL_SECONDS, env.REDIS_URL)
  : globalInMemoryCache;

export const cachedRoomRepo = new CachedRoomRepository(baseRoomRepo, cacheBackend, availabilityVersionProvider, env.CACHE_TTL_SECONDS);

// Shared instances (singletons for Prisma repositories)
export const reservationRepo = new PrismaReservationRepository();
export const roomRepo = cachedRoomRepo; // expose cached implementation
export const pricingEngine = new PricingEngine();

// Use cases with shared dependencies
export const getAvailableRooms = new GetAvailableRooms(roomRepo, pricingEngine);
export const createReservation = new CreateReservation(reservationRepo, roomRepo, pricingEngine);