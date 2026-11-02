import { plainHeader } from "@repo/contracts/section-header";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WhyUsSection } from "./why-us-section";

const header = plainHeader({
  eyebrow: "Dlaczego my",
  title: "Bezpieczna przestrzeń i doświadczony zespół",
});

const facts = [
  { title: "Superwizja", text: "Każdy specjalista pracuje pod superwizją." },
  { title: "Poufność", text: "To, o czym mówisz, zostaje między nami." },
];

describe("WhyUsSection", () => {
  it("keeps four clean paint variants with the original outer droplet clusters", () => {
    const fourFacts = [
      ...facts,
      { title: "Doświadczenie", text: "Praktyka." },
      { title: "Etyka", text: "Zasady." },
    ];
    const { container } = render(
      <WhyUsSection facts={fourFacts} header={header} />,
    );
    const tiles = container.querySelectorAll(".ks-why-us__tile");
    ["sage-1", "pink-1", "sage-2", "pink-2"].forEach((paint, index) => {
      const tile = tiles[index]!;
      expect(
        tile.querySelector(".ks-of__paint-frame > img")?.getAttribute("src"),
      ).toContain(`why-us-${paint}-clean-v2.webp`);
      expect(tile.querySelector(".ks-why-us__particles")).toBeNull();
      const accents = tile.querySelectorAll<SVGElement>(".ks-why-us__droplet");
      expect(accents.length).toBeGreaterThanOrEqual(16);
      expect(accents.length).toBeLessThan(32);
      accents.forEach((accent) => {
        const y = parseFloat(accent.style.top);
        expect(y < 30 || y > 86).toBe(true);
      });
      const batches = new Map<string, number>();
      accents.forEach((accent) => {
        const delay = accent.style.getPropertyValue("--droplet-enter-delay");
        batches.set(delay, (batches.get(delay) ?? 0) + 1);
      });
      expect(batches.size).toBeGreaterThan(1);
      expect(Math.max(...batches.values())).toBeLessThanOrEqual(3);
      expect(
        tile.querySelector(".ks-why-us__droplet image")?.getAttribute("href"),
      ).toContain("why-us-sage-1-droplets.webp");
      expect(tile.querySelector(".ks-of__icon svg")).not.toBeNull();
    });
  });

  it("renders the CMS-selected icon and marks the content for staggered reveal", () => {
    const { container } = render(
      <WhyUsSection
        header={header}
        facts={[{ ...facts[0]!, icon: "book-open" }, facts[1]!]}
      />,
    );
    expect(
      container.querySelector(".ks-of__icon .lucide-book-open"),
    ).not.toBeNull();
    expect(container.querySelector(".ks-of__content")).toHaveAttribute(
      "data-stagger-content",
      "true",
    );
  });

  it("is a section named by its title", () => {
    render(<WhyUsSection facts={facts} header={header} />);
    expect(
      screen.getByRole("region", {
        name: "Bezpieczna przestrzeń i doświadczony zespół",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dlaczego my")).toBeInTheDocument();
  });

  it("lists each fact with its title as a heading under the section's", () => {
    render(<WhyUsSection facts={facts} header={header} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(
      within(items[0]!).getByRole("heading", { level: 3, name: "Superwizja" }),
    ).toBeInTheDocument();
    expect(
      within(items[1]!).getByText("To, o czym mówisz, zostaje między nami."),
    ).toBeInTheDocument();
  });
});
