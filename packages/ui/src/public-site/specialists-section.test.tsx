import { plainHeader } from "@repo/contracts/section-header";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleSpecialists } from "./specialist-samples";
import { SpecialistsSection } from "./specialists-section";

const specialists = sampleSpecialists.slice(0, 2);

describe("SpecialistsSection", () => {
  it("is a section named by the CMS's title, a card per specialist", () => {
    render(
      <SpecialistsSection
        header={plainHeader({
          eyebrow: "Nasi specjaliści",
          title: "Poznaj nasz zespół",
        })}
        specialists={specialists}
      />,
    );
    const section = screen.getByRole("region", { name: "Poznaj nasz zespół" });
    expect(within(section).getByText("Anna Nowak")).toBeInTheDocument();
    expect(within(section).getByText("Tomasz Wójcik")).toBeInTheDocument();
  });

  it("is named by its own heading without the CMS's header", () => {
    render(<SpecialistsSection specialists={specialists} />);
    expect(
      screen.getByRole("region", { name: "Poznaj nasz zespół" }),
    ).toBeInTheDocument();
  });
});
