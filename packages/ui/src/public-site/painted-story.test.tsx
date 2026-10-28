// PaintedStory: a short story told while scrolling. Wide screens with
// motion pin it for its steps; phones let the steps follow one another,
// painting each picture in; reduced motion and no script show it plainly.
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaintedStory } from "./painted-story";
import { loadGsap } from "./lazy-gsap";

// jsdom has no matchMedia; each test says how wide the screen is and what
// the visitor prefers. Queries are "a and b": each part must hold.
function mockMedia({ wide = true, reduce = false } = {}) {
  const holds = (part: string) => {
    if (part.includes("min-width: 64rem")) return wide;
    if (part.includes("max-width: 63.99rem")) return !wide;
    if (part.includes("prefers-reduced-motion: reduce")) return reduce;
    if (part.includes("prefers-reduced-motion: no-preference")) return !reduce;
    if (part.includes("scripting: enabled")) return true;
    return false;
  };
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.split(" and ").every(holds),
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
  {
    heading: "Pierwsza rozmowa",
    text: "Zaczynamy od konsultacji.",
    cta: { href: "/umow-wizyte", label: "Umów wizytę" },
    image: { src: "/images/gabinet.jpg", alt: "Gabinet" },
  },
  {
    heading: "Przestrzeń, która wspiera",
    text: "Przytulne gabinety.",
    image: { src: "/images/gabinet-fotel.webp", alt: "Fotel" },
  },
  {
    heading: "Wydarzenia, które inspirują",
    text: "Warsztaty i grupy.",
    image: { src: "/images/warsztaty.jpg", alt: "Warsztat" },
  },
];

/** GSAP has arrived and the animation has set itself up (useLazyGsap). */
const gsapLoaded = () =>
  act(async () => {
    await loadGsap();
  });

async function renderStory() {
  const { container } = render(
    <PaintedStory
      eyebrow="Jak zacząć"
      heading="Twoja droga do lepszego samopoczucia"
      steps={steps}
    />,
  );
  const root = container.querySelector<HTMLElement>(".ks-story")!;
  await gsapLoaded();
  return {
    root,
    texts: Array.from(root.querySelectorAll<HTMLElement>(".ks-story__text")),
  };
}

afterEach(() => {
  // @ts-expect-error -- reset between tests; a real browser always has one.
  delete window.matchMedia;
});

describe("PaintedStory", () => {
  it("renders the section larger than slide titles and preserves their CMS word colours", () => {
    mockMedia({ reduce: true });
    render(
      <PaintedStory
        heading="Edukacja"
        steps={[
          {
            ...steps[0]!,
            headingSegments: [
              { text: "Pierwsza ", tone: "green" },
              { text: "rozmowa", tone: "pink" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Edukacja" })).toHaveClass(
      "text-h2",
    );
    const heading = screen.getByRole("heading", { name: "Pierwsza rozmowa" });
    expect(heading).toHaveClass("text-h3");
    expect(heading.querySelector(".text-primary-strong")).toHaveTextContent(
      "Pierwsza",
    );
    expect(heading.querySelector(".text-pink-strong")).toHaveTextContent(
      "rozmowa",
    );
  });
  it("keeps its header and server-rendered cards while hiding inactive slide links", async () => {
    mockMedia({ wide: true });
    const { container } = render(
      <PaintedStory
        heading="Wiedza, która wspiera"
        steps={steps.map((step, index) => ({
          ...step,
          content: <a href={`/material-${index}`}>Materiał {index + 1}</a>,
        }))}
      />,
    );
    await gsapLoaded();
    expect(
      screen.getByRole("heading", { name: "Wiedza, która wspiera" }),
    ).toBeInTheDocument();
    const pictures = [
      ...container.querySelectorAll<HTMLElement>(".ks-story__picture"),
    ];
    expect(pictures.map((p) => p.inert)).toEqual([false, true, true]);
    expect(pictures.every((p) => p.dataset.rich === "true")).toBe(true);
    expect(
      screen.queryByRole("img", { name: "Gabinet" }),
    ).not.toBeInTheDocument();
    expect(pictures[0]?.querySelector("a")).toHaveAttribute(
      "href",
      "/material-0",
    );
  });
  it("tells its steps in order: a heading, a count, text, a link and a picture each", async () => {
    const { root } = await renderStory();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Twoja droga do lepszego samopoczucia",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(steps.map((step) => step.heading));
    expect(
      Array.from(root.querySelectorAll(".ks-story__count"), (count) =>
        count.textContent?.replace(/\s/g, ""),
      ),
    ).toEqual(["01/03", "02/03", "03/03"]);
    expect(screen.getByRole("link", { name: "Umów wizytę" })).toHaveAttribute(
      "href",
      "/umow-wizyte",
    );
    expect(screen.getByRole("img", { name: "Fotel" })).toBeInTheDocument();
    expect(root.style.getPropertyValue("--ks-story-steps")).toBe("3");
  });

  it("stays plain when scripting can't be confirmed", async () => {
    const { root, texts } = await renderStory();
    expect(root).not.toHaveAttribute("data-pinned");
    expect(root).not.toHaveAttribute("data-flowing");
    expect(texts.every((text) => !text.inert)).toBe(true);
  });

  it("pins one screen on wide screens, the first step showing, the others out of reach", async () => {
    mockMedia({ wide: true });
    const { root, texts } = await renderStory();
    expect(root).toHaveAttribute("data-pinned", "true");
    expect(texts[0]).toHaveAttribute("data-active", "true");
    expect(texts.map((text) => text.inert)).toEqual([false, true, true]);
  });

  it("lets the steps follow one another on phones", async () => {
    mockMedia({ wide: false });
    const { root, texts } = await renderStory();
    expect(root).toHaveAttribute("data-flowing", "true");
    expect(root).not.toHaveAttribute("data-pinned");
    expect(texts.every((text) => !text.inert)).toBe(true);
  });

  it("stays plain under reduced motion", async () => {
    mockMedia({ wide: true, reduce: true });
    const { root } = await renderStory();
    expect(root).not.toHaveAttribute("data-pinned");
    expect(root).not.toHaveAttribute("data-flowing");
  });
});
