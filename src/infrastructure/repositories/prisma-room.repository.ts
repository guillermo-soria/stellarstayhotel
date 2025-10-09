import { RoomType } from '../../domain/entities/room';
import { RoomRepoPort, RoomSummary, FindAvailableParams } from '../../application/ports/room-repo.port';
import { prismaClient } from '../database/prisma-client';
import { logger } from '../logger';

export class PrismaRoomRepository implements RoomRepoPort {
  async getById(id: string): Promise<RoomSummary | null> {
    try {
      const room = await prismaClient.room.findUnique({
        where: { id }
      });

      if (!room) {
        return null;
      }

      return {
        id: room.id,
        number: room.id, // Using id as number for now
        type: room.type as RoomType,
        capacity: room.capacity
      };
    } catch (error) {
      logger.error({ error }, `Error fetching room ${id}`);
      throw error;
    }
  }

  async findAvailable(params: FindAvailableParams): Promise<{ items: RoomSummary[]; nextCursor: string | null }> {
    try {
      const { checkIn, checkOut, guests, type, limit = 20, cursor } = params;
      
      // Build where clause
      const where: any = {
        isActive: true,
        capacity: { gte: guests }
      };

      if (type) {
        where.type = type;
      }

      // Add cursor pagination
      if (cursor) {
        where.id = { gt: cursor };
      }

      // Find rooms that don't have conflicting reservations
      const rooms = await prismaClient.room.findMany({
        where: {
          ...where,
          reservations: {
            none: {
              OR: [
                {
                  AND: [
                    { checkIn: { lte: checkOut } },
                    { checkOut: { gt: checkIn } }
                  ]
                }
              ]
            }
          }
        },
        take: limit + 1, // Take one extra to determine if there are more
        orderBy: { id: 'asc' }
      });

      const hasMore = rooms.length > limit;
      const items = hasMore ? rooms.slice(0, limit) : rooms;
      
      const roomSummaries = items.map(room => ({
        id: room.id,
        number: room.id, // Using id as number for now
        type: room.type as RoomType,
        capacity: room.capacity
      }));

      const nextCursor = hasMore ? items[items.length - 1].id : null;

      return { items: roomSummaries, nextCursor };
    } catch (error) {
      logger.error({ error }, 'Error finding available rooms');
      throw error;
    }
  }
}
