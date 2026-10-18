import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CrisisStrip, crisisLineHref } from "./crisis-strip";

const lines = [
  {
    number: "112",
    label: "Numer alarmowy",
    detail: "gdy życie jest w bezpośrednim zagrożeniu",
  },
  { number: "116 123", label: "Kryzysowy Telefon Zaufania", detail: "" },
];

describe("CrisisStrip", () => {
  it("is a landmark named by its heading", () => {
    render(
      <CrisisStrip
        heading="Potrzebujesz pomocy teraz?"
        lines={lines}
        text="Jeśli Twoje życie jest w zagrożeniu, dzwoń pod 112."
      />,
    );
    expect(
      screen.getByRole("complementary", { name: "Potrzebujesz pomocy teraz?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Jeśli Twoje życie jest w zagrożeniu, dzwoń pod 112."),
    ).toBeInTheDocument();
  });

  it("dials every number, in the order given", () => {
    render(<CrisisStrip heading="Pomoc" lines={lines} text="" />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(
      within(items[0]!).getByRole("link", { name: "112" }),
    ).toHaveAttribute("href", "tel:112");
    expect(
      within(items[1]!).getByRole("link", { name: "116 123" }),
    ).toHaveAttribute("href", "tel:116123");
    expect(within(items[0]!).getByText(/gdy życie jest/)).toBeInTheDocument();
  });

  it("links to the page about help in a crisis, when given", () => {
    const more = {
      href: "/pomoc-w-kryzysie",
      label: "Więcej o pomocy w kryzysie",
    };
    const { rerender } = render(
      <CrisisStrip heading="Pomoc" lines={lines} more={more} text="" />,
    );
    expect(
      screen.getByRole("link", { name: /Więcej o pomocy w kryzysie/ }),
    ).toHaveAttribute("href", "/pomoc-w-kryzysie");
    rerender(<CrisisStrip heading="Pomoc" lines={lines} text="" />);
    expect(
      screen.queryByRole("link", { name: /Więcej o pomocy/ }),
    ).not.toBeInTheDocument();
  });

  it("leaves the sentence out when there is none", () => {
    const { container } = render(
      <CrisisStrip heading="Pomoc" lines={lines} text="" />,
    );
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("dials a number written with spaces and a plus", () => {
    expect(crisisLineHref("+48 800 702 222")).toBe("tel:+48800702222");
  });
});
