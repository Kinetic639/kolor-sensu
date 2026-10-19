import { z } from "zod";

// Pieces shared by the CMS's content contracts (cms.ts, cms-pages.ts).

/** A path within the public site ("/oferta", "/umow-wizyte#termin"). */
export const sitePathSchema = z
  .string()
  .trim()
  .max(200)
  .refine(
    (href) =>
      href.startsWith("/") && !href.startsWith("//") && !/\s/.test(href),
    "Podaj adres na stronie, zaczynający się od /",
  );

/**
 * The top of a page (PageIntro): a small eyebrow, the title (the page's
 * h1), its second line in brand green and a lead. An empty eyebrow, accent
 * or lead is not shown.
 */
export const pageIntroSchema = z.strictObject({
  eyebrow: z.string().trim().max(80),
  heading: z.string().trim().min(1).max(120),
  accent: z.string().trim().max(120),
  lead: z.string().trim().max(600),
});

export type PageIntroContent = z.infer<typeof pageIntroSchema>;
