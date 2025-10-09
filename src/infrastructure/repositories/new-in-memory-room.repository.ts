import { RoomRepoPort, FindAvailableParams, RoomSummary, RoomType } from "../../application/ports/room-repo.port";

const ROOMS: RoomSummary[] = [
  { id: 'r-101', number: '101', type: 'junior', capacity: 2 },
  { id: 'r-102', number: '102', type: 'junior', capacity: 2 },
  { id: 'r-201', number: '201', type: 'king', capacity: 3 },
  { id: 'r-202', number: '202', type: 'king', capacity: 3 },
  { id: 'r-301', number: '301', type: 'presidential', capacity: 5 },
];

export class NewInMemoryRoomRepository implements RoomRepoPort {
  async findAvailable(p: FindAvailableParams): Promise<{ items: RoomSummary[]; nextCursor: string | null }> {
    const { guests, type, limit = 20, cursor } = p;
    let filtered = ROOMS.filter(r => r.capacity >= guests && (!type || r.type === type));
    
    if (cursor) {
      const idx = filtered.findIndex(r => r.id === cursor);
      filtered = idx >= 0 ? filtered.slice(idx + 1) : filtered;
    }
    
    const items = filtered.slice(0, limit);
    const nextCursor = items.length === limit ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async getById(id: string): Promise<RoomSummary | null> {
    return ROOMS.find(r => r.id === id) ?? null;
  }
}
