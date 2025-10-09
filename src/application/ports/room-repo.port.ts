export type RoomType = 'junior' | 'king' | 'presidential';

export interface FindAvailableParams {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  type?: RoomType;
  limit?: number;
  cursor?: string | null;
}

export interface RoomSummary {
  id: string;
  number: string;
  type: RoomType;
  capacity: number;
}

export interface RoomRepoPort {
  findAvailable(params: FindAvailableParams): Promise<{ items: RoomSummary[]; nextCursor: string | null }>;
  getById(id: string): Promise<RoomSummary | null>;
}
