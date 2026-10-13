import { z } from "zod";

/**
 * A number field's `min` and `max`, from the schema that checks it, so the
 * browser (and a screen reader) knows the real bounds. Without them a
 * number input reports a range of 0 to 0 (#32).
 */
export function numberRange(schema: z.ZodType): { min?: number; max?: number } {
  const inner = schema instanceof z.ZodDefault ? schema.unwrap() : schema;
  if (!(inner instanceof z.ZodNumber)) return {};
  const range: { min?: number; max?: number } = {};
  if (Number.isFinite(inner.minValue)) range.min = inner.minValue!;
  if (Number.isFinite(inner.maxValue)) range.max = inner.maxValue!;
  return range;
}
