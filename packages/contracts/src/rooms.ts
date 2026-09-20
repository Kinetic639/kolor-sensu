import { z } from "zod";

export const roomSlugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL safe.");

export const roomCapacitySchema = z.number().int().min(1).max(100);

export const roomCreateSchema = z.object({
  locationId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  slug: roomSlugSchema,
  description: z.string().trim().max(2000).nullable().default(null),
  active: z.boolean().default(true),
  publiclyVisible: z.boolean().default(false),
  capacity: roomCapacitySchema.default(1),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export const roomUpdateSchema = roomCreateSchema.partial();

export type RoomCreate = z.infer<typeof roomCreateSchema>;
export type RoomUpdate = z.infer<typeof roomUpdateSchema>;

export interface Room {
  id: string;
  locationId: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  publiclyVisible: boolean;
  capacity: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRoomSummary extends Room {
  locationName: string;
  locationSlug: string;
}
