import { z } from "zod";
import { RoomType } from "./availability.schema";

export const ReservationBody = z.object({
  roomId: z.string().min(1),
  type: RoomType,
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1),
  breakfast: z.boolean().default(false),
})
.refine((b) => b.checkOut > b.checkIn, {
  message: "checkOut must be after checkIn",
  path: ["checkOut"],
});

export type ReservationBody = z.infer<typeof ReservationBody>;
