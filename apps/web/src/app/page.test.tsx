// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  defaultFirstSteps,
  defaultHomeHeaders,
  defaultHomeSections,
} from "@repo/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The homepage as a visitor gets it, with what the CMS publishes stood in
// for: each loader returns the site's own content, as before anything is
// published.
vi.mock("@/lib/public-data", () => ({
  getHomeContent: async () => null,
  getHomeHeaders: async () => defaultHomeHeaders,
  getSupportAreas: async () => null,
  getFirstSteps: async () => defaultFirstSteps,
  getHomeSections: async () => ({
    ...defaultHomeSections,
    spotlightImage: null,
  }),
  getSpecialists: async () => [],
}));

beforeAll(() => {
  // Sections animate as they scroll into view.
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  } as unknown as typeof IntersectionObserver;
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

afterEach(cleanup);

// The page pulls in every section of the site: imported once, up front.
let Home: () => Promise<React.JSX.Element>;
beforeAll(async () => {
  ({ default: Home } = await import("./page"));
}, 60_000);

async function renderHome() {
  render(await Home());
}

describe("the homepage", () => {
  it("has no questions and answers: they live on Kontakt", async () => {
    await renderHome();
    expect(
      screen.queryByRole("heading", { name: /Zanim się zobaczymy/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Jak wygląda pierwsza wizyta?"),
    ).not.toBeInTheDocument();
  });

  it("keeps its other sections, in order", async () => {
    await renderHome();
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent ?? "");
    const position = (title: string) =>
      headings.findIndex((text) => text.includes(title));
    const order = [
      "W czym możemy pomóc",
      "Od pierwszego kontaktu do wsparcia na dłużej",
      "Przestrzeń, która wspiera",
      "Twoja droga do lepszego samopoczucia",
    ].map(position);
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
