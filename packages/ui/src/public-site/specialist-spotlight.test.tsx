// SpecialistSpotlight ("Z kim porozmawiasz"): one specialist presented at
// length, the cards' cut-out portrait on its splash, only larger.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpecialistSpotlight } from "./specialist-spotlight";

const specialist = {
  name: "Anna Nowak",
  role: "Psychoterapeutka",
  href: "/specjalisci/anna-nowak",
  portraitSrc: "/kolor-sensu/anna-nowak.png",
  splash: "pink-1" as const,
  bio: "Pracuję z osobami, które przeżywają trudny czas.",
  facts: [
    { label: "W czym pomagam", items: ["lęk", "relacje"] },
    { label: "Z kim pracuję", items: ["dorośli", "pary"] },
    { label: "Formy pracy", items: [] },
  ],
};

function renderSpotlight(extra = {}) {
  render(
    <SpecialistSpotlight
      eyebrow="Poznaj nasz zespół"
      heading="Z kim porozmawiasz"
      description="Krótkie wprowadzenie."
      specialist={specialist}
      booking={{ href: "/umow-wizyte", label: "Umów wizytę" }}
      {...extra}
    />,
  );
  return screen.getByRole("region", { name: "Z kim porozmawiasz" });
}

describe("SpecialistSpotlight", () => {
  it("keeps a clean unmasked copy for professional hover with the same portrait framing", () => {
    const region = renderSpotlight({
      bookingPanel: <div>Kalendarz</div>,
      portraitFraming: { x: 2, y: -3, zoom: 1.1 },
      backgroundFraming: { x: -1, y: -2, zoom: 0.9 },
    });
    const art = region.querySelector(
      ".ks-sp__art--professional",
    ) as HTMLElement;
    expect(art.style.getPropertyValue("--ks-portrait-y")).toBe("-3%");
    expect(art.style.getPropertyValue("--ks-paint-zoom")).toBe("0.9");
    expect(
      art.querySelector(".ks-sp__professional .ks-sp__portrait-img"),
    ).toBeInTheDocument();
    expect(
      art.querySelector(".ks-sp__professional .ks-sp__portrait"),
    ).toBeNull();
    expect(art).toHaveAttribute("tabindex", "0");
  });
  it("uses the selected paint in both layers and only raises 06b", () => {
    const region = renderSpotlight({
      bookingPanel: <div>Kalendarz</div>,
      background: "03",
    });
    const paintImages = region.querySelectorAll(
      ".ks-sp__splash img, .ks-sp__stain img",
    );
    expect(paintImages).toHaveLength(2);
    for (const image of paintImages) {
      expect(image.getAttribute("src")).toContain("specialist-variant-03.webp");
    }
    expect(region).not.toHaveClass("ks-spotlight--raised-paint");
  });

  it("raises the default 06b paint without moving the portrait", () => {
    const region = renderSpotlight({ bookingPanel: <div>Kalendarz</div> });
    expect(region).toHaveClass("ks-spotlight--raised-paint");
    expect(
      region.querySelector(".ks-sp__portrait img")?.getAttribute("src"),
    ).toContain("anna-nowak.png");
  });
  it("is a section under its heading, with the eyebrow above and the caption below", () => {
    const region = renderSpotlight();
    const heading = within(region).getByRole("heading", {
      level: 2,
      name: "Z kim porozmawiasz",
    });
    expect(heading.previousElementSibling).toHaveTextContent(
      "Poznaj nasz zespół",
    );
    expect(heading.nextElementSibling).toHaveTextContent(
      "Krótkie wprowadzenie.",
    );
  });

  it("presents the specialist: portrait, name, role and bio", () => {
    const region = renderSpotlight();
    expect(
      within(region).getByRole("img", { name: "Anna Nowak, psychoterapeutka" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("heading", { level: 3, name: "Anna Nowak" }),
    ).toBeInTheDocument();
    expect(region).toHaveTextContent("Psychoterapeutka");
    expect(region).toHaveTextContent(
      "Pracuję z osobami, które przeżywają trudny czas.",
    );
  });

  it("lists the facts that have anything to say, leaving out the empty ones", () => {
    const region = renderSpotlight();
    const terms = within(region)
      .getAllByRole("term")
      .map((term) => term.textContent);
    expect(terms).toEqual(["W czym pomagam", "Z kim pracuję"]);
    expect(within(region).getByText("lęk")).toBeInTheDocument();
  });

  it("leads to booking and to the full profile", () => {
    const region = renderSpotlight();
    expect(
      within(region).getByRole("link", { name: /Umów wizytę/ }),
    ).toHaveAttribute("href", "/umow-wizyte");
    expect(
      within(region).getByRole("link", { name: /Poznaj mnie bliżej/ }),
    ).toHaveAttribute("href", "/specjalisci/anna-nowak");
  });

  it("groups portrait and facts beside the biography and booking panel", () => {
    const region = renderSpotlight({
      bookingPanel: (
        <section aria-label="Kalendarz wizyt">Wybierz termin</section>
      ),
    });
    expect(region).toHaveClass("ks-spotlight--booking");
    expect(
      within(region).getByRole("region", { name: "Kalendarz wizyt" }),
    ).toBeInTheDocument();
    expect(
      within(region).queryByRole("link", { name: /Umów wizytę/ }),
    ).not.toBeInTheDocument();
    expect(
      within(region).getByRole("link", { name: /Poznaj mnie bliżej/ }),
    ).toBeInTheDocument();
    expect(
      region.querySelector(".ks-spotlight__rail")?.querySelector("dl"),
    ).not.toBeNull();
    expect(
      region
        .querySelector(".ks-spotlight__main")
        ?.querySelector(".ks-spotlight__booking"),
    ).not.toBeNull();
    expect(
      region.querySelector(".ks-spotlight__main")?.querySelector("dl"),
    ).toBeNull();
  });
  it("uses the cards' artwork, larger", () => {
    const region = renderSpotlight();
    const art = region.querySelector(".ks-spotlight__art");
    expect(art).toHaveClass("ks-sp");
    expect(art?.querySelector(".ks-sp__splash")).not.toBeNull();
    expect(art?.querySelector(".ks-sp__plate")).toBeNull();
  });
});
