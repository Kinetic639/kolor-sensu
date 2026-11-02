// SupportAreas: the areas of help as small circles around a large one
// (after Talking Walls' art counseling gallery). Pointing at a small circle,
// focusing it or tapping it shows its area in the large circle, which links
// on.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SUPPORT_AREA_SLOTS, SupportAreas } from "./support-areas";

const areas = [
  {
    id: "indywidualna",
    title: "Terapia indywidualna",
    lead: "Spotkania jeden na jeden.",
    image: { src: "/images/gabinet-fotel.webp", alt: "Fotel w gabinecie" },
    href: "/umow-wizyte",
    linkLabel: "Umów wizytę",
  },
  {
    id: "pary",
    title: "Terapia dla par",
    lead: "Wspólna przestrzeń.",
    image: null,
    href: "/umow-wizyte",
    linkLabel: "Umów wizytę",
  },
  {
    id: "warsztaty",
    title: "Warsztaty i rozwój",
    lead: "Grupy i spotkania.",
    image: { src: "/images/warsztaty.jpg", alt: "Warsztat w kręgu" },
    href: "/warsztaty",
    linkLabel: "Zobacz warsztaty",
  },
];

function renderAreas() {
  render(
    <SupportAreas
      eyebrow="Obszary wsparcia"
      heading="W czym możemy pomóc"
      areas={areas}
      cta={{ href: "/oferta", label: "Zobacz całą ofertę" }}
    />,
  );
  const region = screen.getByRole("region", { name: "W czym możemy pomóc" });
  const center = within(region).getByRole("link", {
    name: /Umów wizytę|Zobacz warsztaty/,
  });
  return { region, center };
}

describe("SupportAreas", () => {
  it("names the section by its heading and offers a button per area", () => {
    const { region } = renderAreas();
    const buttons = within(region).getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual(
      areas.map((area) => area.title),
    );
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the first area in the large circle, linking on", () => {
    const { center } = renderAreas();
    expect(center).toHaveAttribute("href", "/umow-wizyte");
    expect(center).toHaveTextContent("Terapia indywidualna");
    expect(center).toHaveTextContent("Spotkania jeden na jeden.");
    expect(
      within(center).getByRole("img", { name: "Fotel w gabinecie" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["pointing at it", "pointerEnter"],
    ["focusing it", "focus"],
    ["tapping it", "click"],
  ] as const)("shows another area on %s", (_, event) => {
    const { region } = renderAreas();
    const button = within(region).getByRole("button", {
      name: "Warsztaty i rozwój",
    });
    fireEvent[event](button);

    expect(button).toHaveAttribute("aria-pressed", "true");
    const center = within(region).getByRole("link", {
      name: /Zobacz warsztaty/,
    });
    expect(center).toHaveAttribute("href", "/warsztaty");
    expect(center).toHaveTextContent("Warsztaty i rozwój");
    expect(
      within(center).getByRole("img", { name: "Warsztat w kręgu" }),
    ).toBeInTheDocument();
    // Only the shown area's photo is described; the others wait hidden.
    expect(
      within(center).queryByRole("img", { name: "Fotel w gabinecie" }),
    ).toBeNull();
  });

  it("paints an area without a photo, its name inside the small circle", () => {
    const { region } = renderAreas();
    const button = within(region).getByRole("button", {
      name: "Terapia dla par",
    });
    expect(button.querySelector(".ks-wc__photo")).toBeNull();
    expect(
      button.querySelector("[data-animation='watercolor-reveal']"),
    ).toBeInTheDocument();
    expect(within(button).queryByRole("img")).toBeNull();
    expect(button).toHaveTextContent("Terapia dla par");
  });
  it("labels each photo with a paper tag without an additional painted bubble", () => {
    const { region } = renderAreas();
    const photoButton = within(region).getByRole("button", {
      name: "Warsztaty i rozwój",
    });
    const label = photoButton.querySelector(".ks-areas__photo-caption");
    expect(label).toHaveTextContent("Warsztaty i rozwój");
    expect(
      label?.querySelector(".ks-areas__caption-paper"),
    ).toBeInTheDocument();
    expect(label?.closest(".ks-wc__mark")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(label?.querySelector(".ks-areas__caption-underline")).toBeNull();
    expect(photoButton.querySelector(".ks-areas__label-bubble")).toBeNull();
    const textButton = within(region).getByRole("button", {
      name: "Terapia dla par",
    });
    expect(textButton.querySelector(".ks-areas__photo-caption")).toBeNull();
  });

  it("places the small circles on the slots around the large one, in two depths", () => {
    const { region } = renderAreas();
    const items = region.querySelectorAll<HTMLElement>(".ks-areas__item");
    items.forEach((item, index) => {
      const slot = SUPPORT_AREA_SLOTS[index]!;
      expect(item.style.getPropertyValue("--ks-area-x")).toBe(`${slot.x}%`);
      expect(item.style.getPropertyValue("--ks-area-y")).toBe(`${slot.y}%`);
      expect(item.style.getPropertyValue("--ks-area-size")).toBe(
        `${slot.size}rem`,
      );
      expect(item.dataset.depth).toBe(slot.depth);
    });
    expect(new Set(SUPPORT_AREA_SLOTS.map((slot) => slot.depth))).toEqual(
      new Set(["near", "far"]),
    );
    expect(SUPPORT_AREA_SLOTS).toHaveLength(10);
  });

  it("links to the whole offer under the circles", () => {
    renderAreas();
    expect(
      screen.getByRole("link", { name: "Zobacz całą ofertę" }),
    ).toHaveAttribute("href", "/oferta");
  });
  it("uses painted circular compositions while retaining the selected photo description", () => {
    const { region, center } = renderAreas();
    expect(center.querySelector(".ks-wc--circle")).toBeInTheDocument();
    for (const button of within(region).getAllByRole("button")) {
      expect(
        button.querySelector(
          ".ks-wc--circle[data-animation='watercolor-reveal']",
        ),
      ).toBeInTheDocument();
    }
    expect(within(center).getAllByRole("img")).toHaveLength(1);
  });
  it("staggers photo and paint-only circles with small stable delays", () => {
    const { region } = renderAreas();
    const delays = within(region)
      .getAllByRole("button")
      .map((button) =>
        Number(
          button
            .querySelector("[data-animation='watercolor-reveal']")
            ?.getAttribute("data-reveal-delay"),
        ),
      );
    expect(new Set(delays).size).toBeGreaterThan(1);
    expect(delays.every((delay) => delay >= 0.04 && delay <= 0.3)).toBe(true);
  });
  it("spreads fresh paint rotations across the full turn for photos and paint-only circles", () => {
    const { region } = renderAreas();
    const angles = within(region)
      .getAllByRole("button")
      .map((button) =>
        parseFloat(
          button
            .querySelector<HTMLElement>(".ks-wc--circle")!
            .style.getPropertyValue("--ks-circle-rotation"),
        ),
      );
    expect(angles.every((angle) => angle >= 0 && angle < 360)).toBe(true);
    expect(
      new Set(angles.map((angle) => Math.floor(angle / (360 / areas.length))))
        .size,
    ).toBe(areas.length);
  });
});
