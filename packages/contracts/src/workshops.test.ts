import { describe, expect, it } from "vitest";
import { emptyWorkshopInput, workshopInputSchema } from "./workshops";

const leader = "4f9b6d2e-8c1a-4e3b-9f7d-2a6c5b8e1d40";
const location = "5a1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e";

const input = {
  ...emptyWorkshopInput(leader),
  title: "Uważność",
  slug: "uwaznosc",
  locationId: location,
  date: "2030-11-12",
};

describe("a workshop's form", () => {
  it("takes a complete workshop", () => {
    expect(workshopInputSchema.safeParse(input).success).toBe(true);
  });

  it("refuses what the database would, in Polish", () => {
    const problem = (patch: object) => {
      const parsed = workshopInputSchema.safeParse({ ...input, ...patch });
      return parsed.success ? null : parsed.error.issues[0]!.message;
    };
    expect(problem({ endTime: "16:00" })).toBe("Koniec musi być po początku.");
    expect(problem({ locationId: null })).toBe("Wybierz miejsce warsztatu.");
    expect(problem({ modality: "online", locationId: null })).toBeNull();
    expect(problem({ minParticipants: 20 })).toBe(
      "Minimum nie może być większe niż liczba miejsc.",
    );
    expect(problem({ slug: "Zły Adres" })).toBe(
      "Adres: małe litery, cyfry i myślniki.",
    );
    expect(problem({ meetingUrl: "http://example.invalid" })).toBe(
      "Link do spotkania zaczyna się od https://.",
    );
    expect(problem({ capacity: 0 })).toBe("Co najmniej 1 miejsce.");
  });
});
