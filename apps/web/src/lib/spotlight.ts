import {
  clientGroupLabels,
  plainHeader,
  type HomeSectionsContent,
} from "@repo/contracts";
import type { SpecialistSpotlightProps } from "@repo/ui/public-site";
import {
  portraitPlaceholder,
  specialistHref,
  specialistRole,
  specialistSplash,
} from "./presentation";
import type { SpecialistWithMedia } from "./public-data";

/** Home's sections as the site reads them: the spotlight's photo resolved. */
export type HomeSections = HomeSectionsContent & {
  spotlightImage: string | null;
};

/**
 * "Z kim porozmawiasz": the specialist the CMS chose, among those on the
 * site (published and active); none while the section is hidden or the
 * specialist is gone. Empty texts take the site's own; the CMS's own photo
 * takes the specialist's place.
 */
export function toSpotlight(
  sections: HomeSections,
  specialists: readonly SpecialistWithMedia[],
): Omit<SpecialistSpotlightProps, "booking"> | null {
  const { spotlight } = sections;
  if (!spotlight.visible) return null;
  const index = specialists.findIndex(
    (specialist) => specialist.specialistId === spotlight.specialistId,
  );
  const chosen = specialists[index];
  if (!chosen) return null;

  const role = specialistRole(chosen);
  return {
    header: plainHeader({
      eyebrow: spotlight.eyebrow || "Poznaj nasz zespół",
      title: spotlight.heading || "Z kim porozmawiasz",
      description: spotlight.description,
    }),
    specialist: {
      name: chosen.displayName,
      role,
      href: specialistHref(chosen.publicSlug),
      portraitSrc:
        sections.spotlightImage ??
        chosen.portraitUrl ??
        chosen.photoUrl ??
        portraitPlaceholder,
      portraitAlt:
        (sections.spotlightImage && spotlight.imageAlt) ||
        `${chosen.displayName}, ${role.toLowerCase()}`,
      splash: specialistSplash(index),
      bio: chosen.shortBio || undefined,
      facts: [
        { label: "W czym pomagam", items: chosen.specializations.slice(0, 6) },
        {
          label: "Z kim pracuję",
          items: clientGroupLabels(chosen.clientGroups),
        },
        { label: "Formy pracy", items: chosen.modalities },
      ],
    },
  };
}
