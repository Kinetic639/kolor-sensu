import { describe, expect, it } from "vitest";
import type { SpecialistWithMedia } from "./public-data";
import { toSpecialistCard } from "./presentation";

const anna = {
  specialistId: "6f1c2b9a-3c41-4e2b-9a55-0d3f2a7b8c10",
  publicSlug: "anna-nowak",
  displayName: "Anna Nowak",
  professionalTitle: "Psychoterapeutka",
  active: true,
  portraitUrl: null,
  photoUrl: null,
} as unknown as SpecialistWithMedia;

describe("toSpecialistCard", () => {
  it("names the specialist and leads to the profile", () => {
    expect(toSpecialistCard(anna, 0)).toMatchObject({
      name: "Anna Nowak",
      role: "Psychoterapeutka",
      href: "/specjalisci/anna-nowak",
    });
  });

  it("says when a specialist takes no new clients (#63)", () => {
    expect(toSpecialistCard({ ...anna, active: false }, 0).role).toBe(
      "Psychoterapeutka · nie przyjmuje nowych osób",
    );
  });
});
