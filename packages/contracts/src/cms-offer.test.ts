import { describe, expect, it } from "vitest";
import {
  defaultOfferPage,
  defaultPricesPage,
  defaultServicePage,
  offerPageContentSchema,
  PRICE_RULES_MAX,
  pricesPageContentSchema,
  servicePageContentSchema,
} from "./cms-offer";

describe("the offer pages' words", () => {
  it("start from the site's own words, each one valid", () => {
    expect(offerPageContentSchema.parse(defaultOfferPage)).toEqual(
      defaultOfferPage,
    );
    expect(servicePageContentSchema.parse(defaultServicePage)).toEqual(
      defaultServicePage,
    );
    expect(pricesPageContentSchema.parse(defaultPricesPage)).toEqual(
      defaultPricesPage,
    );
    expect(defaultOfferPage.intro.heading).toBe("Oferta");
    expect(defaultPricesPage.intro.heading).toBe("Cennik");
  });

  it("refuse a page without its title", () => {
    expect(
      offerPageContentSchema.safeParse({
        ...defaultOfferPage,
        intro: { ...defaultOfferPage.intro, heading: " " },
      }).success,
    ).toBe(false);
  });

  it("refuse a button without words on a service's page", () => {
    expect(
      servicePageContentSchema.safeParse({
        ...defaultServicePage,
        unbooked: { ...defaultServicePage.unbooked, contactLabel: "" },
      }).success,
    ).toBe(false);
  });

  it("keep the price list's rules to a few, each with a title and words", () => {
    const rule = { title: "Zasada", text: "Treść" };
    expect(
      pricesPageContentSchema.safeParse({
        ...defaultPricesPage,
        rules: Array.from({ length: PRICE_RULES_MAX + 1 }, () => rule),
      }).success,
    ).toBe(false);
    expect(
      pricesPageContentSchema.safeParse({
        ...defaultPricesPage,
        rules: [{ title: "Zasada", text: "" }],
      }).success,
    ).toBe(false);
  });
});
