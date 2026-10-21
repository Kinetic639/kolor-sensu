// SupportAreas: the areas of help as drops of paint around a large
// watercolour blot. Pointing at a drop, focusing it or tapping it shows its
// area in the blot, which links on.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SUPPORT_AREA_SLOTS, SupportAreas, areaPaint } from "./support-areas";

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

  it("keeps the area shown before under the new one while it blooms in", () => {
    const { region } = renderAreas();
    fireEvent.click(
      within(region).getByRole("button", { name: "Warsztaty i rozwój" }),
    );
    const pictures = region.querySelectorAll<HTMLElement>(".ks-areas__picture");
    expect([...pictures].map((picture) => picture.dataset.state)).toEqual([
      "previous",
      undefined,
      "shown",
    ]);
  });

  it("washes the stage in the chosen area's paint, sage and pink by turns", () => {
    const { region } = renderAreas();
    const stage = region.querySelector<HTMLElement>(".ks-areas__stage")!;
    expect(stage.dataset.paint).toBe("sage");
    fireEvent.click(
      within(region).getByRole("button", { name: "Terapia dla par" }),
    );
    expect(stage.dataset.paint).toBe("pink");
    expect([0, 1, 2, 3].map(areaPaint)).toEqual([
      "sage",
      "pink",
      "sage",
      "pink",
    ]);
  });

  it("names photographed drops under them, for sighted visitors only", () => {
    const { region } = renderAreas();
    const button = within(region).getByRole("button", {
      name: "Terapia indywidualna",
    });
    const name = button.querySelector(".ks-areas__name");
    expect(name).toHaveTextContent("Terapia indywidualna");
    expect(name).toHaveAttribute("aria-hidden", "true");
  });

  it("paints an area without a photo, its name inside the drop", () => {
    const { region } = renderAreas();
    const button = within(region).getByRole("button", {
      name: "Terapia dla par",
    });
    expect(button.querySelector("img")).toBeNull();
    expect(button).toHaveTextContent("Terapia dla par");
  });

  it("places the drops on the slots around the blot, in two depths", () => {
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
      expect(item.style.getPropertyValue("--ks-area-blot")).toBe(
        `url("/watercolor/areas-blot-${slot.blot}.png")`,
      );
      expect(item.style.getPropertyValue("--ks-area-drop")).toBe(
        `url("/watercolor/areas-drop-${areaPaint(index)}-${slot.blot}.webp")`,
      );
    });
    expect(new Set(SUPPORT_AREA_SLOTS.map((slot) => slot.depth))).toEqual(
      new Set(["near", "far"]),
    );
    expect(SUPPORT_AREA_SLOTS).toHaveLength(10);
  });

  it("links to the whole offer under the drops", () => {
    renderAreas();
    expect(
      screen.getByRole("link", { name: "Zobacz całą ofertę" }),
    ).toHaveAttribute("href", "/oferta");
  });
});
