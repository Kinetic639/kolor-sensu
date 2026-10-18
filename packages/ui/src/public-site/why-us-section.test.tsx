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
