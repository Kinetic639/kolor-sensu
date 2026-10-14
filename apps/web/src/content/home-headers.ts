import { plainHeader } from "@repo/contracts";
import { rooms, specialistsCopy, story, supportAreasCopy } from "./site";

// The homepage sections' headers in the shared format
// (@repo/contracts/section-header): the site's own words, every one in the
// default colour. The CMS will set its own over these; the markup (heading
// levels, sizes, order) stays each section's.

export const homeHeaders = {
  supportAreas: plainHeader({
    eyebrow: supportAreasCopy.eyebrow,
    title: supportAreasCopy.heading,
    description: supportAreasCopy.description,
  }),
  specialists: plainHeader({
    eyebrow: specialistsCopy.eyebrow,
    title: specialistsCopy.heading,
    description: specialistsCopy.description,
    cta: {
      label: "Zobacz wszystkich specjalistów",
      href: "/specjalisci",
      style: "arrow",
    },
  }),
  rooms: plainHeader({
    eyebrow: rooms.eyebrow,
    title: rooms.heading,
    description: rooms.description,
    cta: { label: "Zobacz nasze gabinety", href: "/gabinety", style: "arrow" },
  }),
  story: plainHeader({ eyebrow: story.eyebrow, title: story.heading }),
  faq: plainHeader({
    eyebrow: "Pytania i odpowiedzi",
    title: "Zanim się zobaczymy",
    description:
      "Najczęstsze pytania osób, które zastanawiają się nad pierwszą wizytą.",
    cta: {
      label: "Masz inne pytanie? Napisz do nas",
      href: "/kontakt",
      style: "arrow",
    },
  }),
};
