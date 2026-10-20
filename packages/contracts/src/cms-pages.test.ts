import { describe, expect, it } from "vitest";
import {
  aboutHeadersContentSchema,
  aboutPageContentSchema,
  closingCtaContentSchema,
  contactPageContentSchema,
  defaultAboutHeaders,
  defaultAboutPage,
  defaultClosingCta,
  defaultContactPage,
  defaultSiteContact,
  defaultSpecialistsPage,
  siteContactContentSchema,
  specialistsPageContentSchema,
} from "./cms-pages";
import { defaultRoomsPageContent, roomsPageContentSchema } from "./cms";

describe("O nas", () => {
  it("starts from the site's words, its optional parts off", () => {
    expect(defaultAboutPage.intro.title[0]![0]!.text).toBe("O nas");
    expect(defaultAboutPage.values).toHaveLength(3);
    expect(defaultAboutPage).toMatchObject({
      showStory: false,
      showProfessionalism: false,
      showAudiences: false,
    });
    expect(aboutHeadersContentSchema.parse(defaultAboutHeaders)).toEqual(
      defaultAboutHeaders,
    );
  });

  it("has exactly three value cards", () => {
    const [one, two] = defaultAboutPage.values;
    expect(
      aboutPageContentSchema.safeParse({ values: [one, two] }).success,
    ).toBe(false);
  });

  it("leads each audience card to a page of the site", () => {
    const [card] = defaultAboutPage.audiences;
    expect(
      aboutPageContentSchema.safeParse({
        audiences: [{ ...card, href: "https://x.pl" }],
      }).success,
    ).toBe(false);
  });

  it("keeps the facts under Profesjonalizm to eight short lines", () => {
    expect(
      aboutPageContentSchema.safeParse({
        professionalism: Array(9).fill("Superwizja"),
      }).success,
    ).toBe(false);
  });
});

describe("Gabinety", () => {
  it("reads switches saved before its words, with the site's words", () => {
    const rooms = roomsPageContentSchema.parse({
      showAmenitiesSection: false,
      showLocationDetails: true,
    });
    expect(rooms.intro.title[0]![0]!.text).toBe("Gabinety");
    expect(rooms.amenities).toEqual(defaultRoomsPageContent.amenities);
    expect(rooms.showAmenitiesSection).toBe(false);
  });
});

describe("the other pages and the shared settings", () => {
  it("accept their own defaults", () => {
    expect(specialistsPageContentSchema.parse(defaultSpecialistsPage)).toEqual(
      defaultSpecialistsPage,
    );
    expect(contactPageContentSchema.parse(defaultContactPage)).toEqual(
      defaultContactPage,
    );
    expect(closingCtaContentSchema.parse(defaultClosingCta)).toEqual(
      defaultClosingCta,
    );
    expect(siteContactContentSchema.parse(defaultSiteContact)).toEqual(
      defaultSiteContact,
    );
  });

  it("refuses a page without its title", () => {
    expect(
      contactPageContentSchema.safeParse({
        ...defaultContactPage,
        intro: { ...defaultContactPage.intro, title: [] },
      }).success,
    ).toBe(false);
  });
});
