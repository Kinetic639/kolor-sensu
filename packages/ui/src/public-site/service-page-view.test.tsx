import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  SERVICE_FALLBACK_DESCRIPTION,
  ServiceFacts,
  ServicePageView,
  serviceParagraphs,
} from "./service-page-view";

describe("serviceParagraphs", () => {
  it("splits on blank lines; without a description, the fallback", () => {
    expect(serviceParagraphs("Pierwszy.\n\n  Drugi.\n")).toEqual([
      "Pierwszy.",
      "Drugi.",
    ]);
    expect(serviceParagraphs(null)).toEqual([SERVICE_FALLBACK_DESCRIPTION]);
    expect(serviceParagraphs("  ")).toEqual([SERVICE_FALLBACK_DESCRIPTION]);
  });
});

describe("ServicePageView", () => {
  it("the description, the way to book and who leads it at what price", () => {
    render(
      <>
        <ServiceFacts duration="50 min" price="od 200 zł" />
        <ServicePageView
          action={<a href="/umow-wizyte">Umów wizytę</a>}
          paragraphs={["Pierwszy.", "Drugi."]}
          team={[
            {
              key: "ms",
              name: "Michał Stępień",
              href: "/specjalisci/michal-stepien",
              meta: "220 zł · 50 min · w gabinecie lub online",
            },
          ]}
        />
      </>,
    );
    expect(screen.getByText("od 200 zł")).toBeVisible();
    expect(screen.getByText("Drugi.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Umów wizytę" })).toBeVisible();
    const card = screen.getByRole("heading", {
      name: "Kto prowadzi",
    }).parentElement!;
    expect(
      within(card).getByRole("link", { name: "Michał Stępień" }),
    ).toHaveAttribute("href", "/specjalisci/michal-stepien");
    expect(card).toHaveTextContent("220 zł · 50 min");
  });

  it("nobody yet: how to get help instead; no price, no price fact", () => {
    render(
      <>
        <ServiceFacts duration="90 min" />
        <ServicePageView paragraphs={["Opis."]} team={[]} />
      </>,
    );
    expect(screen.queryByText("Cena:")).toBeNull();
    expect(screen.getByText(/dobierzemy specjalistę/)).toBeVisible();
  });
});
