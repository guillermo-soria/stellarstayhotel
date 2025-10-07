import { RoomRepoPort } from "../ports/room-repo.port";
import { DateRange } from "../../domain/entities/room";

export class GetAvailableRooms {
  constructor(private rooms: RoomRepoPort) {}
  async execute(params: {
    dateRange: DateRange;
    guests: number;
    type?: "junior" | "king" | "presidential";
  }) {
    return this.rooms.findAvailable({ ...params, limit: 20, cursor: null });
  }
}
