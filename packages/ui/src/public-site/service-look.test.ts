import { describe, expect, it } from "vitest";
import { offerPaintAt, serviceDisplayName } from "./service-look";

describe("serviceDisplayName", () => {
  it("starts with a capital letter, Polish ones too", () => {
    expect(serviceDisplayName(" konsultacja psychologiczna")).toBe(
      "Konsultacja psychologiczna",
    );
    expect(serviceDisplayName("ćwiczenia")).toBe("Ćwiczenia");
  });
});

describe("offerPaintAt", () => {
  it("goes sage, pink, sage, pink along the offer, and round again", () => {
    expect([0, 1, 2, 3, 4].map(offerPaintAt)).toEqual([
      "sage-1",
      "pink-1",
      "sage-2",
      "pink-2",
      "sage-1",
    ]);
  });

  it("gives the first one to a service not in the offer", () => {
    expect(offerPaintAt(-1)).toBe("sage-1");
  });
});
