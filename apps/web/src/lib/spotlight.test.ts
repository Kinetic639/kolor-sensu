import { defaultHomeSections } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import type { SpecialistWithMedia } from "./public-data";
import { toSpotlight } from "./spotlight";

const anna = {
  specialistId: "6f1c2b9a-3c41-4e2b-9a55-0d3f2a7b8c10",
  publicSlug: "anna-nowak",
  displayName: "Anna Nowak",
  professionalTitle: "Psychoterapeutka",
  shortBio: "Pracuję z dorosłymi.",
  specializations: ["lęk", "relacje"],
  clientGroups: ["adults", "couples"],
  modalities: [],
  portraitUrl: "https://cdn.test/portrait.png",
  photoUrl: "https://cdn.test/photo.jpg",
} as unknown as SpecialistWithMedia;

const other = {
  ...anna,
  specialistId: "0a7c1f52-7a3a-4f36-9a7a-2d8a9f0c1b11",
  publicSlug: "tomasz",
  displayName: "Tomasz",
} as SpecialistWithMedia;

const sections = (
  spotlight: Partial<typeof defaultHomeSections.spotlight>,
) => ({
  ...defaultHomeSections,
  spotlight: { ...defaultHomeSections.spotlight, ...spotlight },
  spotlightImage: null,
});

describe("toSpotlight", () => {
  it("shows nothing while the section is hidden", () => {
    expect(
      toSpotlight(sections({ specialistId: anna.specialistId }), [anna]),
    ).toBeNull();
  });

  it("shows nothing when the chosen specialist is not on the site", () => {
    expect(
      toSpotlight(
        sections({ visible: true, specialistId: anna.specialistId }),
        [other],
      ),
    ).toBeNull();
  });

  it("presents the chosen specialist with the site's own texts when the CMS leaves them empty", () => {
    const spotlight = toSpotlight(
      sections({ visible: true, specialistId: anna.specialistId }),
      [other, anna],
    );
    expect(spotlight).toMatchObject({
      eyebrow: "Poznaj nasz zespół",
      heading: "Z kim porozmawiasz",
      description: undefined,
      specialist: {
        name: "Anna Nowak",
        role: "Psychoterapeutka",
        href: "/specjalisci/anna-nowak",
        portraitSrc: "https://cdn.test/portrait.png",
        bio: "Pracuję z dorosłymi.",
      },
    });
    expect(spotlight?.specialist.facts).toEqual([
      { label: "W czym pomagam", items: ["lęk", "relacje"] },
      { label: "Z kim pracuję", items: ["Dorośli", "Pary"] },
      { label: "Formy pracy", items: [] },
    ]);
  });

  it("uses the CMS's texts and its own photo when given", () => {
    const spotlight = toSpotlight(
      {
        ...sections({
          visible: true,
          specialistId: anna.specialistId,
          eyebrow: "Nasz zespół",
          heading: "Poznaj Annę",
          description: "Wprowadzenie.",
          imageAlt: "Anna w gabinecie",
        }),
        spotlightImage: "https://cdn.test/site-media/spotlight/a.png",
      },
      [anna],
    );
    expect(spotlight).toMatchObject({
      eyebrow: "Nasz zespół",
      heading: "Poznaj Annę",
      description: "Wprowadzenie.",
      specialist: {
        portraitSrc: "https://cdn.test/site-media/spotlight/a.png",
        portraitAlt: "Anna w gabinecie",
      },
    });
  });
});
