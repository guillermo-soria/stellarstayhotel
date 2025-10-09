import {
  ReservationRepoPort,
  CreateReservationParams,
  ReservationDTO
} from '../../application/ports/reservation-repo.port';
import { prismaClient } from '../database/prisma-client';
import { logger } from '../logger';
import { randomUUID } from 'crypto';

export class PrismaReservationRepository implements ReservationRepoPort {
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

      // Get room to retrieve type information
      const room = await prismaClient.room.findUnique({
        where: { id: params.roomId }
      });

      if (!room) {
        throw new Error(`Room ${params.roomId} not found`);
      }

      // Create new reservation
      const id = randomUUID();
      const reservation = await prismaClient.reservation.create({
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

      logger.info(`Reservation ${id} created successfully`);
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

  private mapToDTO(reservation: any): ReservationDTO {
    return {
      id: reservation.id,
      roomId: reservation.roomId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guests: reservation.guests,
      breakfast: reservation.breakfast,
      totalCents: reservation.totalCents,
      status: reservation.status,
      createdAt: reservation.createdAt,
      idempotencyKey: reservation.idempotencyKey
    };
  }
}
