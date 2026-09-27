import { slugify } from "@/lib/slugify";
import { z } from "zod";

/** The same rules as `specialistSlugSchema`, with messages for the form. */
export const publicSlugFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3, "Adres musi mieć od 3 do 100 znaków.")
    .max(100, "Adres musi mieć od 3 do 100 znaków.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Używaj małych liter bez polskich znaków, cyfr i pojedynczych myślników.",
    ),
});

export type PublicSlugFormValues = z.infer<typeof publicSlugFormSchema>;

/** A proposed address from the specialist's name, or "" if too short. */
export function suggestPublicSlug(name: string): string {
  const slug = slugify(name);
  return slug.length >= 3 ? slug : "";
}
