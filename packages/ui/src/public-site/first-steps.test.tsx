// FirstSteps ("Pierwszy krok"): four steps of starting therapy on a compact
// band, joined by a wave that draws itself with scroll; each step waits
// grey and takes colour once the line reaches it. Without motion it is simply the
// finished band.
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FirstSteps, showProgress } from "./first-steps";
import { WAVE_PATH } from "./first-steps-wave";

function mockMedia({ reduce = false, wide = true } = {}) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("prefers-reduced-motion: reduce")
      ? reduce
      : query.includes("min-width")
        ? wide
        : query.includes("max-width")
          ? !wide
          : query.includes("scripting"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const steps = [
  { title: "Kontakt", text: "Umawiasz się na dogodny termin." },
  { title: "Pierwsze spotkanie", text: "Rozmawiamy o Twoich potrzebach." },
  { title: "Wspólny plan", text: "Proponujemy formy wsparcia." },
  { title: "Rozpoczęcie pracy", text: "Zaczynamy w Twoim tempie." },
];

function renderSteps() {
  render(
    <FirstSteps
      eyebrow="Pierwszy krok"
      heading="Od pierwszego kontaktu do wsparcia na dłużej"
      description="Cztery proste kroki."
      steps={steps}
    />,
  );
  const region = screen.getByRole("region", {
    name: "Od pierwszego kontaktu do wsparcia na dłużej",
  });
  return {
    region,
    items: within(region).getAllByRole("listitem"),
  };
}

afterEach(() => {
  // @ts-expect-error -- reset between tests; a real browser always has one.
  delete window.matchMedia;
});

describe("FirstSteps", () => {
  it("is a section under its heading, the four steps an ordered list", () => {
    const { region, items } = renderSteps();
    expect(region).toHaveTextContent("Pierwszy krok");
    expect(region).toHaveTextContent("Cztery proste kroki.");
    expect(within(region).getByRole("list").tagName).toBe("OL");
    expect(
      within(region)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(steps.map((step) => step.title));
    expect(items[2]).toHaveTextContent("Proponujemy formy wsparcia.");
  });

  it("draws the wave and the brush stroke as decoration only", () => {
    const { region } = renderSteps();
    const wave = region.querySelector(".ks-steps__wave")!;
    expect(wave).toHaveAttribute("aria-hidden", "true");
    expect(wave.querySelector("path")).toHaveAttribute("d", WAVE_PATH);
    expect(region.querySelector(".ks-steps__ribbon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    // No pictures to describe: the icons and the stroke are decoration.
    expect(within(region).queryAllByRole("img")).toHaveLength(0);
  });

  it("is the finished band when scripting can't be confirmed", () => {
    const { region } = renderSteps();
    expect(region).not.toHaveAttribute("data-armed");
  });

  it("is the finished band under reduced motion", () => {
    mockMedia({ reduce: true });
    const { region } = renderSteps();
    expect(region).not.toHaveAttribute("data-armed");
  });

  it("waits grey when motion is welcome, held in place on a wide screen", () => {
    mockMedia();
    const { region, items } = renderSteps();
    expect(region).toHaveAttribute("data-armed", "true");
    expect(region).toHaveAttribute("data-held", "true");
    expect(items.every((item) => !item.hasAttribute("data-bloomed"))).toBe(
      true,
    );
    // The wave has not started: it waits for the band to hold still.
    const line = region.querySelector<SVGPathElement>(".ks-steps__wave-line")!;
    expect(line.style.strokeDashoffset).toBe("1");
  });

  it("is armed but not held on a narrow screen (steps colour as they come into view)", () => {
    mockMedia({ wide: false });
    const { region } = renderSteps();
    expect(region).toHaveAttribute("data-armed", "true");
    expect(region).not.toHaveAttribute("data-held");
  });
});

describe("showProgress", () => {
  it("draws the wave so far and gives colour to the steps it has reached, for good", () => {
    mockMedia();
    const { region, items } = renderSteps();
    const line = region.querySelector<SVGPathElement>(".ks-steps__wave-line")!;

    showProgress(region, 0.45);
    expect(line.style.strokeDashoffset).toBe("0.55");
    expect(items.map((item) => item.hasAttribute("data-bloomed"))).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(region.style.getPropertyValue("--ks-steps-progress")).toBe("0.45");

    // Scrolling back takes the wave with it, not the steps.
    showProgress(region, 0.1);
    expect(line.style.strokeDashoffset).toBe("0.9");
    expect(items[1]).toHaveAttribute("data-bloomed");
  });
});
