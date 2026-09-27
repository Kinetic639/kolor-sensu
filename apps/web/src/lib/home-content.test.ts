import { describe, expect, it } from "vitest";
import { withHomeContent } from "./home-content";

const hero = {
  heading: "Więcej zrozumienia.",
  accent: "Więcej sensu.",
  description: "Psychoterapia i wsparcie.",
  primaryAction: { label: "Umów wizytę", href: "/umow-wizyte" },
  secondaryAction: { label: "Poznaj nas", href: "/o-nas" },
};

describe("withHomeContent", () => {
  it("keeps the code-owned hero without published CMS content", () => {
    expect(withHomeContent(hero, null)).toBe(hero);
  });

  it("puts the CMS fields into the hero, keeping routes and the accent", () => {
    const result = withHomeContent(hero, {
      heading: "Wsparcie, które ma sens.",
      body: "Nowy opis centrum.",
      buttonLabel: "Zarezerwuj termin",
    });

    expect(result).toEqual({
      ...hero,
      heading: "Wsparcie, które ma sens.",
      description: "Nowy opis centrum.",
      primaryAction: { label: "Zarezerwuj termin", href: "/umow-wizyte" },
    });
  });

  it("keeps the default button label when the CMS leaves it empty", () => {
    const result = withHomeContent(hero, {
      heading: "Nagłówek",
      body: "Opis",
      buttonLabel: null,
    });
    expect(result.primaryAction?.label).toBe("Umów wizytę");
  });
});
