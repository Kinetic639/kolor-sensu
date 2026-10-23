// FirstSteps ("Pierwszy krok"): four steps of starting therapy on a compact
// band, joined by a wave that draws itself with scroll; each step waits
// grey and takes colour once the line reaches it. Without motion it is simply the
// finished band.
import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FirstSteps, showProgress } from "./first-steps";
import { WAVE_PATH } from "./first-steps-wave";
import { loadGsap } from "./lazy-gsap";

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

/** GSAP has arrived and the animation has set itself up (useLazyGsap). */
const gsapLoaded = () =>
  act(async () => {
    await loadGsap();
  });

async function renderSteps() {
  // As on a page opened at its top: the band lies below the first screen
  // (jsdom lays nothing out, so it would count as scrolled past).
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 2000,
    bottom: 2800,
    left: 0,
    right: 1200,
    width: 1200,
    height: 800,
    x: 0,
    y: 2000,
    toJSON: () => ({}),
  } as DOMRect);
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
  await gsapLoaded();
  return {
    region,
    items: within(region).getAllByRole("listitem"),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error -- reset between tests; a real browser always has one.
  delete window.matchMedia;
});

describe("FirstSteps", () => {
  it("is a section under its heading, the four steps an ordered list", async () => {
    const { region, items } = await renderSteps();
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

  it("draws the wave and the brush stroke as decoration only", async () => {
    const { region } = await renderSteps();
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

  it("is the finished band when scripting can't be confirmed", async () => {
    const { region } = await renderSteps();
    expect(region).not.toHaveAttribute("data-armed");
  });

  it("is the finished band under reduced motion", async () => {
    mockMedia({ reduce: true });
    const { region } = await renderSteps();
    expect(region).not.toHaveAttribute("data-armed");
  });

  it("waits grey when motion is welcome, held in place on a wide screen", async () => {
    mockMedia();
    const { region, items } = await renderSteps();
    expect(region).toHaveAttribute("data-armed", "true");
    expect(region).toHaveAttribute("data-held", "true");
    expect(items.every((item) => !item.hasAttribute("data-bloomed"))).toBe(
      true,
    );
    // The wave has not started: it waits for the band to hold still.
    const line = region.querySelector<SVGPathElement>(".ks-steps__wave-line")!;
    expect(line.style.strokeDashoffset).toBe("1");
  });

  it("is armed but not held on a narrow screen (steps colour as they come into view)", async () => {
    mockMedia({ wide: false });
    const { region } = await renderSteps();
    expect(region).toHaveAttribute("data-armed", "true");
    expect(region).not.toHaveAttribute("data-held");
  });
});

describe("showProgress", () => {
  it("draws the wave so far and gives colour to the steps it has reached, for good", async () => {
    mockMedia();
    const { region, items } = await renderSteps();
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

    // Shown a smaller progress, the wave goes back (the band itself never
    // asks for less), the steps keep their colour.
    showProgress(region, 0.1);
    expect(line.style.strokeDashoffset).toBe("0.9");
    expect(items[1]).toHaveAttribute("data-bloomed");
  });
});
