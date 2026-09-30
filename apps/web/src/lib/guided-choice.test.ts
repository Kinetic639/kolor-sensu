import { describe, expect, it } from "vitest";
import { concernsOf, toGuidedSpecialist } from "./guided-choice";
import type { SpecialistWithMedia } from "./public-data";

const specialist = {
  displayName: "Anna Nowak",
  professionalTitle: "Psychoterapeutka",
  publicSlug: "anna-nowak",
  portraitUrl: null,
  photoUrl: "https://example.com/anna.jpg",
  clientGroups: ["adults", "couples", "families"],
  specializations: ["Zaburzenia lękowe", "Terapia par"],
  modalities: ["Stacjonarnie", "Online"],
} as unknown as SpecialistWithMedia;

describe("guided choice", () => {
  it("reads concerns from specializations by keywords", () => {
    expect(concernsOf(["Depresja", "Kryzys emocjonalny"])).toEqual([
      "mood",
      "crisis",
    ]);
    expect(concernsOf(["Psychodietetyka"])).toEqual([]);
  });

  it("maps a profile to what the matching needs", () => {
    expect(toGuidedSpecialist(specialist)).toEqual({
      name: "Anna Nowak",
      role: "Psychoterapeutka",
      href: "/specjalisci/anna-nowak",
      portraitSrc: "https://example.com/anna.jpg",
      audiences: ["self", "couple"],
      concerns: ["anxiety", "relations"],
      online: true,
    });
  });
});
