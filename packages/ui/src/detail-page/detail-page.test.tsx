import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DetailBar,
  DetailBody,
  DetailProp,
  DetailProps,
  DetailSection,
  DetailTabs,
} from "./detail-page";

describe("DetailBar", () => {
  it("the way back, who it is and its state", () => {
    render(
      <DetailBar
        actions={<button type="button">Akcje</button>}
        back={{ href: "/specjalisci", label: "Specjaliści" }}
        subtitle="Psycholog"
        tags={<span>Aktywny</span>}
        title="Anna Kłobuchowska"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Wróć: Specjaliści" }),
    ).toHaveAttribute("href", "/specjalisci");
    expect(
      screen.getByRole("heading", { level: 1, name: "Anna Kłobuchowska" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Psycholog")).toBeInTheDocument();
    expect(screen.getByText("Aktywny")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Akcje" })).toBeInTheDocument();
  });
});

describe("DetailBar: the title as a control", () => {
  it("in the heading, in the name's place", () => {
    render(
      <DetailBar
        back={{ href: "/gabinety", label: "Gabinety" }}
        title="Gabinet Niebieski"
        titleControl={<button type="button">Gabinet Niebieski ▾</button>}
      />,
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toContainElement(
      screen.getByRole("button", { name: "Gabinet Niebieski ▾" }),
    );
  });
});

describe("DetailTabs", () => {
  it("each section a link, the shown one current", () => {
    render(
      <DetailTabs
        active="uslugi"
        label="Sekcje specjalisty"
        tabs={[
          { key: "przeglad", label: "Przegląd", href: "/s/1" },
          {
            key: "uslugi",
            label: "Usługi i cennik",
            href: "/s/1?zakladka=uslugi",
            count: 4,
          },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Sekcje specjalisty" });
    expect(
      within(nav).getByRole("link", { name: "Przegląd" }),
    ).not.toHaveAttribute("aria-current");
    expect(
      within(nav).getByRole("link", { name: "Usługi i cennik 4" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

describe("DetailBody and sections", () => {
  it("named sections of rows, a column beside", () => {
    render(
      <DetailBody aside={<p>Tydzień</p>} asideLabel="Ten tydzień">
        <DetailSection
          actions={<button type="button">Podgląd</button>}
          title="Profil"
        >
          <DetailProps>
            <DetailProp label="Stan">Opublikowany</DetailProp>
          </DetailProps>
        </DetailSection>
      </DetailBody>,
    );
    const section = screen.getByRole("region", { name: "Profil" });
    expect(within(section).getByRole("term")).toHaveTextContent("Stan");
    expect(within(section).getByRole("definition")).toHaveTextContent(
      "Opublikowany",
    );
    expect(
      screen.getByRole("complementary", { name: "Ten tydzień" }),
    ).toHaveTextContent("Tydzień");
  });
});
