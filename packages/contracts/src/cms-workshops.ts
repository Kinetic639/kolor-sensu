import { z } from "zod";
import { pageHeader, pageHeaderSchema } from "@repo/contracts/cms-shared";

// The CMS's words for /warsztaty (#210; docs/architecture/cms-domain.md):
// its top and the line while no workshop is coming. The workshops come from
// the portal (Warsztaty), the structure and look from code. Seeded as a
// draft with the site's words.

export const workshopsPageContentSchema = z.strictObject({
  intro: pageHeaderSchema,
  emptyText: z.string().trim().min(1).max(400),
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
};
