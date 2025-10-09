import { RoomRepoPort, FindAvailableParams, RoomSummary } from "../../application/ports/room-repo.port";
import { Room, RoomType } from "../../domain/entities/room";

// Base rates should match PricingEngine constants
const BASE_RATES: Record<RoomType, number> = {
  junior: 60_00,
  king: 90_00, 
  presidential: 150_00,
};

export class InMemoryRoomRepository implements RoomRepoPort {
  private rooms: Room[] = [
    // Sample rooms data - using consistent base rates
    { id: "room-001", type: "junior", capacity: 2, baseRate: BASE_RATES.junior },
    { id: "room-002", type: "junior", capacity: 2, baseRate: BASE_RATES.junior },
    { id: "room-003", type: "king", capacity: 3, baseRate: BASE_RATES.king },
    { id: "room-004", type: "king", capacity: 3, baseRate: BASE_RATES.king },
    { id: "room-005", type: "king", capacity: 4, baseRate: BASE_RATES.king },
    { id: "room-006", type: "presidential", capacity: 6, baseRate: BASE_RATES.presidential },
  ];

  async findAvailable(params: FindAvailableParams): Promise<{ items: RoomSummary[]; nextCursor: string | null }> {
    // Filter rooms by type if specified
    let availableRooms = this.rooms;
    
    if (params.type) {
      availableRooms = availableRooms.filter(room => room.type === params.type);
    }

    // Filter by capacity (room must accommodate all guests)
    availableRooms = availableRooms.filter(room => room.capacity >= params.guests);

    // For now, assume all rooms are available (in real impl, check inventory)
    // TODO: Check actual inventory/reservations using checkIn/checkOut
    
    // Apply pagination
    const limit = params.limit || 20;
    const startIndex = params.cursor ? parseInt(params.cursor) : 0;
    const endIndex = startIndex + limit;
    const paginatedRooms = availableRooms.slice(startIndex, endIndex);
    
    // Transform to expected format
    const items: RoomSummary[] = paginatedRooms.map(room => ({
      id: room.id,
      number: room.id, // Using id as number for simplicity
      type: room.type,
      capacity: room.capacity,
    }));

    // Calculate next cursor
    const nextCursor = endIndex < availableRooms.length ? endIndex.toString() : null;

    return { items, nextCursor };
  }

  async getById(id: string): Promise<RoomSummary | null> {
    const room = this.rooms.find(room => room.id === id);
    if (!room) return null;

    return {
      id: room.id,
      number: room.id, // Using id as number for simplicity
      type: room.type,
      capacity: room.capacity,
    };
  }
}
