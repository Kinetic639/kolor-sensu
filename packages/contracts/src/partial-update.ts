import { z } from "zod";

/**
 * The update schema for a create schema: every field optional and without
 * its default. `createSchema.partial()` keeps the defaults, so an update that
 * sends one field would reset the others (e.g. disabling a location would
 * clear its address).
 */
export function partialUpdateSchema<Shape extends z.ZodRawShape>(
  createSchema: z.ZodObject<Shape>,
) {
  const shape = Object.fromEntries(
    Object.entries(createSchema.shape).map(([key, field]) => [
      key,
      field instanceof z.ZodDefault ? field.unwrap() : field,
    ]),
  ) as { [Key in keyof Shape]: Shape[Key] };
  return z.object(shape).partial();
}
