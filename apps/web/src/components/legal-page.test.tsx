// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { LegalPageContent } from "@repo/contracts/cms-legal";
import { defaultLegalPages } from "@repo/contracts/cms-legal-content";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// A legal document's page as a visitor gets it: the CMS's header as the
// one h1, the date it applies from, the document's headings under it, its
// links, and a way to ask. Each route shows its own document.

let pages: Record<string, LegalPageContent> = { ...defaultLegalPages };
const asked: string[] = [];
vi.mock("@/lib/public-data", () => ({
  getLegalPage: async (key: string) => {
    asked.push(key);
    return pages[key];
  },
}));
vi.mock("@/lib/page-metadata", () => ({ pageMetadata: async () => ({}) }));

let LegalPage: (props: { page: string }) => Promise<ReactElement>;
beforeAll(async () => {
  ({ LegalPage } = (await import("./legal-page")) as never);
}, 60_000);

afterEach(() => {
  cleanup();
  pages = { ...defaultLegalPages };
  asked.length = 0;
});

describe("a legal page", () => {
  it("has the document's title as its one h1, its sections under it", async () => {
    render(await LegalPage({ page: "legal_terms" }));
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Regulamin",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "3. Płatności" }),
    ).toBeVisible();
  });

  it("says the sample is a sample, and links within the site", async () => {
    render(await LegalPage({ page: "legal_privacy" }));
    expect(screen.getByText(/przykładowa treść/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Pliki cookies" })).toHaveAttribute(
      "href",
      "/cookies",
    );
    expect(
      screen.getByRole("link", { name: /Pytania\? Napisz do nas/ }),
    ).toHaveAttribute("href", "/kontakt");
  });

  it("shows the date it applies from, once the CMS gives one", async () => {
    render(await LegalPage({ page: "legal_cookies" }));
    expect(screen.queryByText(/Obowiązuje od/)).not.toBeInTheDocument();
    cleanup();
    pages = {
      ...pages,
      legal_cookies: {
        ...pages.legal_cookies!,
        effectiveFrom: "1 listopada 2026",
      },
    };
    render(await LegalPage({ page: "legal_cookies" }));
    expect(screen.getByText("Obowiązuje od: 1 listopada 2026")).toBeVisible();
  });

  it("shows the CMS's document, with its lists", async () => {
    pages = {
      ...pages,
      legal_terms: {
        ...pages.legal_terms!,
        body: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Zasady" }],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Pierwsza zasada" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    render(await LegalPage({ page: "legal_terms" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Zasady" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("list")).getByText("Pierwsza zasada"),
    ).toBeVisible();
    expect(screen.queryByText(/przykładowa treść/)).not.toBeInTheDocument();
  });
});

describe("the legal routes", () => {
  it("each show their own document", async () => {
    for (const [route, key] of [
      ["regulamin", "legal_terms"],
      ["polityka-prywatnosci", "legal_privacy"],
      ["cookies", "legal_cookies"],
    ] as const) {
      const { default: Page } = (await import(`../app/${route}/page.tsx`)) as {
        default: () => ReactElement;
      };
      expect(Page().props).toEqual({ page: key });
    }
  });
});
