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
  it("renders the same word and eyebrow colors as other CMS section headings", () => {
    render(
      <CrisisStrip
        heading="Starszy tekst"
        text="Opis"
        lines={lines}
        header={{
          eyebrow: { text: "Pomoc", tone: "green" },
          title: [
            [
              { text: "Potrzebujesz ", tone: "default" },
              { text: "wsparcia", tone: "pink" },
            ],
            [{ text: "teraz?", tone: "green" }],
          ],
        }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Potrzebujesz wsparcia teraz?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pomoc")).toHaveClass("text-primary-strong");
    expect(screen.getByText("wsparcia")).toHaveClass("text-pink");
    expect(screen.getByText("teraz?")).toHaveClass("text-primary");
    expect(screen.queryByText("Starszy tekst")).not.toBeInTheDocument();
  });
  it("keeps the details link in the intro before the CMS contact list", () => {
    const { container } = render(
      <CrisisStrip
        heading="Pomoc"
        lines={lines}
        text="Opis"
        more={{ href: "/pomoc-w-kryzysie", label: "Dowiedz się więcej" }}
      />,
    );
    const intro = container.querySelector("header");
    expect(intro).not.toBeNull();
    expect(
      within(intro!).getByRole("link", { name: "Dowiedz się więcej" }),
    ).toHaveAttribute("href", "/pomoc-w-kryzysie");
    expect(
      intro!.compareDocumentPosition(screen.getByRole("list")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
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

  it("renders all six CMS contacts without substituting fixed mockup content", () => {
    const contacts = Array.from({ length: 6 }, (_, index) => ({
      number: `123 456 00${index}`,
      label: `Własna nazwa kontaktu ${index + 1}`,
      detail: `Własny opis dostępności ${index + 1}`,
    }));
    render(
      <CrisisStrip
        eyebrow="Własny napis"
        heading="Własny nagłówek"
        text="Własny opis"
        lines={contacts}
      />,
    );
    expect(screen.getByText("Własny napis")).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    contacts.forEach((contact, index) => {
      expect(
        within(items[index]!).getByRole("heading", {
          level: 3,
          name: contact.label,
        }),
      ).toBeInTheDocument();
      expect(
        within(items[index]!).getByRole("link", { name: contact.number }),
      ).toHaveAttribute("href", `tel:12345600${index}`);
      expect(
        within(items[index]!).getByText(contact.detail),
      ).toBeInTheDocument();
    });
  });

  it("dials a number written with spaces and a plus", () => {
    expect(crisisLineHref("+48 800 702 222")).toBe("tel:+48800702222");
  });
});
