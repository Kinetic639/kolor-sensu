import type { HomePageContent } from "@repo/contracts";

interface HeroCopy {
  heading: string;
  description?: string;
  primaryAction?: { label: string; href: string };
}

/**
 * The CMS edits three typed fields of the home hero (docs/architecture/
 * cms-domain.md): heading, body and the main button's label. Everything else
 * (the painted accent line, links, images) stays in code.
 */
export function withHomeContent<T extends HeroCopy>(
  hero: T,
  content: HomePageContent | null,
): T {
  if (!content) return hero;
  return {
    ...hero,
    heading: content.heading,
    description: content.body,
    primaryAction: hero.primaryAction && {
      ...hero.primaryAction,
      label: content.buttonLabel || hero.primaryAction.label,
    },
  };
}
