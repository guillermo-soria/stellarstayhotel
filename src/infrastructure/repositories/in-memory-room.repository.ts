import { RoomRepoPort } from "../../application/ports/room-repo.port";
import { Room, RoomType, DateRange } from "../../domain/entities/room";

export class InMemoryRoomRepository implements RoomRepoPort {
  private rooms: Room[] = [
    // Sample rooms data
    { id: "room-001", type: "junior", capacity: 2, baseRate: 60_00 },
    { id: "room-002", type: "junior", capacity: 2, baseRate: 60_00 },
    { id: "room-003", type: "king", capacity: 3, baseRate: 90_00 },
    { id: "room-004", type: "king", capacity: 3, baseRate: 90_00 },
    { id: "room-005", type: "king", capacity: 4, baseRate: 90_00 },
    { id: "room-006", type: "presidential", capacity: 6, baseRate: 150_00 },
  ];

  async findAvailable(params: {
    dateRange: DateRange;
    guests: number;
    type?: "junior" | "king" | "presidential";
    limit?: number;
    cursor?: string | null;
  }): Promise<Array<{
    roomId: string;
    type: "junior" | "king" | "presidential";
    capacity: number;
    baseRate: number;
  }>> {
    // Filter rooms by type if specified
    let availableRooms = this.rooms;
    
    if (params.type) {
      availableRooms = availableRooms.filter(room => room.type === params.type);
    }

    // Filter by capacity (room must accommodate all guests)
    availableRooms = availableRooms.filter(room => room.capacity >= params.guests);

    // For now, assume all rooms are available (in real impl, check inventory)
    // TODO: Check actual inventory/reservations
    
    // Apply pagination
    const limit = params.limit || 20;
    const startIndex = params.cursor ? parseInt(params.cursor) : 0;
    const endIndex = startIndex + limit;
    const paginatedRooms = availableRooms.slice(startIndex, endIndex);
    
    // Transform to expected format
    return paginatedRooms.map(room => ({
      roomId: room.id,
      type: room.type,
      capacity: room.capacity,
      baseRate: room.baseRate,
    }));
  }

  async findById(id: string): Promise<Room | null> {
    return this.rooms.find(room => room.id === id) || null;
  }
}
