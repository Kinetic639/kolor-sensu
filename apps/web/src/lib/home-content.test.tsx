import {
  defaultHomeStory,
  homePageContentSchema,
  type HomePageContent,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { toStorySteps, withHomeContent, type HomeHero } from "./home-content";

const hero = {
  eyebrow: "Centrum psychoterapii i rozwoju",
  heading: "Więcej zrozumienia.",
  accent: "Więcej sensu.",
  description: "Psychoterapia i wsparcie.",
  primaryAction: { label: "Umów wizytę", href: "/umow-wizyte" },
  secondaryAction: { label: "Poznaj nas", href: "/o-nas" },
  image: { src: "/images/gabinet-fotel.webp", alt: "Jasny gabinet" },
};

const published = (content: Partial<HomePageContent>): HomeHero => ({
  ...homePageContentSchema.parse({
    heading: "Nagłówek",
    body: "Opis",
    ...content,
  }),
  imageUrl: null,
});

describe("withHomeContent", () => {
  it("keeps the code-owned hero without published CMS content", () => {
    expect(withHomeContent(hero, null)).toBe(hero);
  });

  it("puts the CMS's words into the hero, keeping its links", () => {
    const result = withHomeContent(
      hero,
      published({
        eyebrow: "Psychoterapia w Poznaniu",
        heading: "Wsparcie, które ma sens.",
        accent: "Krok po kroku.",
        body: "Nowy opis centrum.",
        buttonLabel: "Zarezerwuj termin",
        secondaryLabel: "O centrum",
      }),
    );
    expect(result).toMatchObject({
      eyebrow: "Psychoterapia w Poznaniu",
      heading: "Wsparcie, które ma sens.",
      accent: "Krok po kroku.",
      description: "Nowy opis centrum.",
      primaryAction: { label: "Zarezerwuj termin", href: "/umow-wizyte" },
      secondaryAction: { label: "O centrum", href: "/o-nas" },
    });
  });

  it("keeps the default button labels when the CMS leaves them empty", () => {
    const result = withHomeContent(hero, published({}));
    expect(result.primaryAction?.label).toBe("Umów wizytę");
    expect(result.secondaryAction?.label).toBe("Poznaj nas");
  });

  it("leaves out an empty eyebrow and accent", () => {
    const result = withHomeContent(
      hero,
      published({ eyebrow: "", accent: "" }),
    );
    expect(result.eyebrow).toBeUndefined();
    expect(result.accent).toBeUndefined();
  });

  it("draws each point's icon, the heart in pink", () => {
    const result = withHomeContent(
      hero,
      published({
        points: [
          { label: "Przytulne gabinety", icon: "house" },
          { label: "Atmosfera zaufania", icon: "heart" },
        ],
      }),
    );
    expect(result.points?.map(({ label, tone }) => [label, tone])).toEqual([
      ["Przytulne gabinety", "primary"],
      ["Atmosfera zaufania", "pink"],
    ]);
    expect(result.points?.every((point) => point.icon)).toBe(true);
  });

  it("shows the CMS's photo with its description, or the site's", () => {
    const own = withHomeContent(hero, {
      ...published({ imagePath: "hero/a.webp", imageAlt: "Fotel przy oknie" }),
      imageUrl: "https://cdn.example.invalid/hero/a.webp",
    });
    expect(own.image).toMatchObject({
      src: "https://cdn.example.invalid/hero/a.webp",
      alt: "Fotel przy oknie",
    });
    expect(withHomeContent(hero, published({})).image).toEqual(hero.image);
  });
});

describe("toStorySteps", () => {
  const images = [
    { src: "/a.webp", alt: "A" },
    { src: "/b.webp", alt: "B" },
  ];

  it("gives each step its CMS photo, or the site's in turn", () => {
    const steps = toStorySteps(
      {
        steps: defaultHomeStory.steps.map((step, index) => ({
          ...step,
          imageUrl: index === 1 ? "https://cdn.example.invalid/s.webp" : null,
          imageAlt: index === 1 ? "Gabinet" : "",
        })),
      },
      images,
    );
    expect(steps.map((step) => step.image)).toEqual([
      { src: "/a.webp", alt: "A" },
      { src: "https://cdn.example.invalid/s.webp", alt: "Gabinet" },
      { src: "/a.webp", alt: "A" },
    ]);
    expect(steps[0]).toMatchObject({
      heading: "Pierwsza rozmowa",
      cta: { label: "Umów wizytę", href: "/umow-wizyte" },
    });
  });

  it("leaves out a step's button when it has none", () => {
    const [step] = toStorySteps(
      {
        steps: [{ ...defaultHomeStory.steps[0]!, cta: null, imageUrl: null }],
      },
      images,
    );
    expect(step?.cta).toBeUndefined();
  });
});
