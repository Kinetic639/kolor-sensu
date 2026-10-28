import type {
  HeroPoint,
  HomePageContent,
  HomeStoryContent,
  HomeStoryStep,
} from "@repo/contracts";
import type { HeroSectionProps, PaintedStoryStep } from "@repo/ui/public-site";
import { Heart, House, Leaf, ShieldCheck, Sparkles, Users } from "lucide-react";

// Home → the CMS's words on the code-owned hero and story
// (docs/architecture/cms-domain.md): the links stay in code, the words,
// points and photos are the admin's.

/** The published hero, its photo as an address. */
export interface HomeHero extends HomePageContent {
  imageUrl: string | null;
}

const icons: Record<HeroPoint["icon"], React.ReactNode> = {
  leaf: <Leaf />,
  users: <Users />,
  house: <House />,
  heart: <Heart />,
  shield: <ShieldCheck />,
  sparkles: <Sparkles />,
};

export function withHomeContent(
  hero: HeroSectionProps,
  content: HomeHero | null,
): HeroSectionProps {
  if (!content) return hero;
  return {
    ...hero,
    eyebrow: content.eyebrow || undefined,
    heading: content.heading,
    accent: content.accent || undefined,
    description: content.body,
    primaryAction: hero.primaryAction && {
      ...hero.primaryAction,
      label: content.buttonLabel || hero.primaryAction.label,
    },
    secondaryAction: hero.secondaryAction && {
      ...hero.secondaryAction,
      label: content.secondaryLabel || hero.secondaryAction.label,
    },
    points: content.points.map(({ label, icon }) => ({
      label,
      icon: icons[icon],
      tone: icon === "heart" ? "pink" : "primary",
    })),
    image: content.imageUrl
      ? { ...hero.image, src: content.imageUrl, alt: content.imageAlt }
      : hero.image,
  };
}

/** The published story, each step's photo as an address. */
export interface HomeStory {
  steps: (HomeStoryContent["steps"][number] & { imageUrl: string | null })[];
}

/**
 * The story's steps for PaintedStory: a step without its own photo takes
 * the site's, in turn.
 */
export function toStorySteps(
  story: HomeStory,
  images: readonly PaintedStoryStep["image"][],
): PaintedStoryStep[] {
  return story.steps.map(
    (step: HomeStoryStep & { imageUrl: string | null }, index) => ({
      heading: step.heading,
      ...(step.headingSegments
        ? { headingSegments: step.headingSegments }
        : {}),
      text: step.text,
      cta: step.cta ?? undefined,
      image: step.imageUrl
        ? { src: step.imageUrl, alt: step.imageAlt }
        : images[index % images.length]!,
    }),
  );
}
