import { z } from "zod";
import { pageHeader, pageHeaderSchema } from "@repo/contracts/cms-shared";

// The CMS's words for /warsztaty (#210; docs/architecture/cms-domain.md):
// its top, the line while no workshop is coming and the rules every
// workshop shares (#231; each workshop adds its own: the refund date,
// paying later, its minimum). The workshops come from the portal
// (Warsztaty), the structure and look from code. Seeded as a draft with
// the site's words.

export const WORKSHOP_RULES_MAX = 8;

export const workshopsPageContentSchema = z.strictObject({
  intro: pageHeaderSchema,
  emptyText: z.string().trim().min(1).max(400),
  /** Saved before #231 without them: none. */
  rules: z
    .array(z.string().trim().min(1).max(300))
    .max(WORKSHOP_RULES_MAX)
    .default([]),
});

export type WorkshopsPageContent = z.infer<typeof workshopsPageContentSchema>;

export const defaultWorkshopsPage: WorkshopsPageContent = {
  intro: pageHeader({
    eyebrow: "Warsztaty i rozwój",
    title: "Warsztaty",
    accent: "Rozwój w dobrym towarzystwie.",
    lead: "Prowadzimy warsztaty, grupy rozwojowe i spotkania tematyczne. Nowe terminy ogłaszamy z wyprzedzeniem; zapytaj nas o najbliższe wydarzenia.",
  }),
  emptyText:
    "Obecnie nie mamy zaplanowanych wydarzeń. Zostaw nam wiadomość, a damy znać, gdy pojawią się nowe terminy.",
  rules: [],
};
