import { z } from "zod";

export const RoomType = z.enum(["junior", "king", "presidential"]);

export const AvailabilityQuerySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1),
  type: RoomType.optional(),
  breakfast: z.coerce.boolean().optional().default(false), // Add breakfast support
  breakdown: z.coerce.boolean().optional().default(false), // Add breakdown support
})
.refine((q) => q.checkOut > q.checkIn, { message: "checkOut must be after checkIn", path: ["checkOut"] })
.refine((q) => {
  const inD = new Date(q.checkIn);
  const outD = new Date(q.checkOut);
  const nights = Math.round((+outD - +inD) / 86_400_000);
  return nights > 0 && nights <= 30;
}, { message: "stay length must be 1..30 nights", path: ["checkOut"] });

export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;
