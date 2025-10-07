import { DateRange } from "../../domain/entities/room";

export interface RoomRepoPort {
  findAvailable(params: {
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
  }>>;
}
