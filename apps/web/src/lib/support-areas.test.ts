import type { PublicSupportArea } from "@repo/supabase";
import { describe, expect, it } from "vitest";
import { toSupportAreaItems } from "./support-areas";

const booking = { href: "/umow-wizyte", label: "Umów wizytę" };

const site: PublicSupportArea[] = [
  {
    id: "indywidualna",
    title: "Terapia indywidualna",
    lead: "Z kodu strony.",
    image: { src: "/images/gabinet-fotel.webp", alt: "Fotel" },
    link: null,
  },
];

const published: PublicSupportArea[] = [
  {
    id: "pary",
    title: "Terapia dla par",
    lead: "Z CMS.",
    image: null,
    link: null,
  },
  {
    id: "warsztaty",
    title: "Warsztaty",
    lead: "Z CMS.",
    image: { src: "https://cdn.test/a.webp", alt: "Warsztat" },
    link: { href: "/warsztaty", label: "Zobacz warsztaty" },
  },
];

describe("toSupportAreaItems", () => {
  it("shows the site's own areas until the CMS publishes some", () => {
    expect(toSupportAreaItems(null, site, booking)).toEqual([
      {
        id: "indywidualna",
        title: "Terapia indywidualna",
        lead: "Z kodu strony.",
        image: { src: "/images/gabinet-fotel.webp", alt: "Fotel" },
        href: "/umow-wizyte",
        linkLabel: "Umów wizytę",
      },
    ]);
  });

  it("shows the published areas, each leading where it says or to booking", () => {
    const items = toSupportAreaItems(published, site, booking);
    expect(items.map((item) => item.id)).toEqual(["pary", "warsztaty"]);
    expect(items[0]).toMatchObject({
      href: "/umow-wizyte",
      linkLabel: "Umów wizytę",
    });
    expect(items[1]).toMatchObject({
      href: "/warsztaty",
      linkLabel: "Zobacz warsztaty",
      image: { src: "https://cdn.test/a.webp", alt: "Warsztat" },
    });
  });
});
