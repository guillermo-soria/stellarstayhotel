import { z } from "zod";
import { RoomType } from "./availability.schema";

// Accept either a date-only (YYYY-MM-DD) or a full RFC3339 datetime string
const DateOrDateTime = z.union([
  z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
  z.string().datetime()
]);

export const ReservationBody = z.object({
  roomId: z.string().min(1),
  type: RoomType,
  checkIn: DateOrDateTime,
  checkOut: DateOrDateTime,
  guests: z.number().int().min(1),
  breakfast: z.boolean().default(false),
})
.refine((b) => new Date(b.checkOut).getTime() > new Date(b.checkIn).getTime(), {
  message: "checkOut must be after checkIn",
  path: ["checkOut"],
});

export type ReservationBody = z.infer<typeof ReservationBody>;
