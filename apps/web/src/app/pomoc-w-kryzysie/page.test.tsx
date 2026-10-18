// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { defaultCrisisHelp, type CrisisHelpContent } from "@repo/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// /pomoc-w-kryzysie: where to get help at once, 112 first; the numbers are
// the crisis strip's (one place in the CMS for both).

let crisis: CrisisHelpContent = defaultCrisisHelp;
vi.mock("@/lib/public-data", () => ({
  getCrisisHelp: async () => crisis,
}));

let Page: () => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Page } = await import("./page"));
}, 60_000);

beforeEach(() => {
  crisis = defaultCrisisHelp;
});
afterEach(cleanup);

describe("the crisis help page", () => {
  it("says first to call 112, and that the centre is not emergency help", async () => {
    render(await Page());
    expect(
      screen.getByRole("heading", { level: 1, name: /Pomoc w kryzysie/ }),
    ).toBeInTheDocument();
    const [first] = screen.getAllByRole("link");
    expect(first).toHaveAttribute("href", "tel:112");
    expect(first).toHaveAccessibleName(/Zadzwoń pod 112/);
    expect(
      screen.getByText(/nie udziela pomocy w nagłych wypadkach/),
    ).toBeInTheDocument();
  });

  it("lists the CMS's other numbers, each one dialling (112 is above)", async () => {
    crisis = {
      ...defaultCrisisHelp,
      lines: [
        { number: "112", label: "Numer alarmowy", detail: "" },
        {
          number: "116 123",
          label: "Telefon Zaufania",
          detail: "dla dorosłych",
        },
      ],
    };
    render(await Page());
    const list = screen.getByRole("list", {
      name: "Bezpłatne telefony wsparcia",
    });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(
      within(items[0]!).getByRole("link", { name: /116 123/ }),
    ).toHaveAttribute("href", "tel:116123");
    expect(within(items[0]!).getByText(/dla dorosłych/)).toBeInTheDocument();
  });
});
