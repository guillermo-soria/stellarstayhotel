import {
  ReservationRepoPort,
  CreateReservationParams,
  ReservationDTO
} from '../../application/ports/reservation-repo.port';
import { prismaClient } from '../database/prisma-client';
import { logger } from '../logger';
import { randomUUID } from 'crypto';

export class PrismaReservationRepository implements ReservationRepoPort {
  static onAvailabilityInvalidated?: () => void;
  async create(params: CreateReservationParams): Promise<ReservationDTO> {
    try {
      // Check for existing reservation with same idempotency key
      if (params.idempotencyKey) {
        const existing = await prismaClient.reservation.findUnique({
          where: { idempotencyKey: params.idempotencyKey }
        });

        if (existing) {
          return this.mapToDTO(existing);
        }
      }

      // Create new reservation and increment availabilityVersion atomically
      const id = randomUUID();
      const reservation = await prismaClient.$transaction(async (tx) => {
        // Get room to retrieve type information
        const room = await tx.room.findUnique({ where: { id: params.roomId } });
        if (!room) {
          throw new Error(`Room ${params.roomId} not found`);
        }

        const created = await tx.reservation.create({
          data: {
            id,
            roomId: params.roomId,
            type: room.type, // Get room type from the room
            checkIn: params.checkIn,
            checkOut: params.checkOut,
            guests: params.guests,
            breakfast: !!params.breakfast,
            totalCents: params.totalCents,
            status: 'CONFIRMED',
            createdAt: new Date(),
            idempotencyKey: params.idempotencyKey
          }
        });

        await tx.room.update({
          where: { id: params.roomId },
          data: { availabilityVersion: { increment: 1 } }
        });

        return created;
      });

      PrismaReservationRepository.onAvailabilityInvalidated?.();
      // Also clear in-memory cache when running tests or when using in-memory cache implementation
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { globalInMemoryCache } = require('../cache/in-memory.cache');
        if (globalInMemoryCache && typeof globalInMemoryCache.clearAll === 'function') {
          await globalInMemoryCache.clearAll();
        }
      } catch (_e) {
        // ignore - cache backend might be redis or not expose clearAll
      }

      logger.info(`Reservation ${reservation.id} created successfully`);
      return this.mapToDTO(reservation);
    } catch (error) {
      logger.error({ error }, `Error creating reservation`);
      throw error;
    }
  }

  async getById(id: string): Promise<ReservationDTO | null> {
    try {
      const reservation = await prismaClient.reservation.findUnique({
        where: { id }
      });

      if (!reservation) {
        return null;
      }

      return this.mapToDTO(reservation);
    } catch (error) {
      logger.error({ error }, `Error fetching reservation ${id}`);
      throw error;
    }
  }

  async findByIdempotencyKey(key: string): Promise<ReservationDTO | null> {
    try {
      if (!key) {
        return null;
      }

      const reservation = await prismaClient.reservation.findUnique({
        where: { idempotencyKey: key }
      });

      if (!reservation) {
        return null;
      }

      return this.mapToDTO(reservation);
    } catch (error) {
      logger.error({ error }, `Error finding reservation by idempotency key`);
      throw error;
    }
  }

  async hasOverlap(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
    try {
      const overlapping = await prismaClient.reservation.findFirst({
        where: {
          roomId,
          OR: [
            {
              AND: [
                { checkIn: { lte: checkOut } },
                { checkOut: { gt: checkIn } }
              ]
            }
          ]
        }
      });

      return !!overlapping;
    } catch (error) {
      logger.error({ error }, `Error checking reservation overlap for room ${roomId}`);
      throw error;
    }
  }

  // Test helper method - only for testing
  async clearAll(): Promise<void> {
    try {
      await prismaClient.reservation.deleteMany();
      logger.info('All reservations cleared for testing');
    } catch (error) {
      logger.error({ error }, 'Error clearing reservations');
      throw error;
    }
  }

  private mapToDTO(reservation: {
    id: string;
    roomId: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    breakfast: boolean;
    totalCents: number;
    status: string;
    createdAt: Date;
    idempotencyKey: string | null;
  }): ReservationDTO {
    const allowed = ['CONFIRMED','PENDING','CANCELLED'] as const;
    type Status = typeof allowed[number];
    const isStatus = (v: unknown): v is Status => typeof v === 'string' && (allowed as readonly string[]).includes(v);
    const status: Status = isStatus(reservation.status) ? reservation.status : 'CONFIRMED';
    return {
      id: reservation.id,
      roomId: reservation.roomId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guests: reservation.guests,
      breakfast: reservation.breakfast,
      totalCents: reservation.totalCents,
      status,
      createdAt: reservation.createdAt,
      idempotencyKey: reservation.idempotencyKey ?? undefined
    };
  }
}
