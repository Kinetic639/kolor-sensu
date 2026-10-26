import { plainHeader } from "@repo/contracts/section-header";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocationSection } from "./location-section";

const header = plainHeader({
  eyebrow: "Gdzie jesteśmy",
  title: "Odwiedź nas",
  cta: { href: "/kontakt", label: "Kontakt", style: "arrow" },
});
const address = { street: "ul. Długa 1", postalCode: "61-001", city: "Poznań" };
describe("LocationSection", () => {
  it("uses the CMS's contact details and leaves the consent boundary to the app", () => {
    render(
      <LocationSection
        header={header}
        contact={{
          address,
          phone: "+48123456789",
          phoneLabel: "+48 123 456 789",
          email: "kontakt@example.invalid",
          hours: "Pn–Pt 8–20",
        }}
        map={<p>Mapa oczekuje na zgodę</p>}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Odwiedź nas" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "+48 123 456 789" }),
    ).toHaveAttribute("href", "tel:+48123456789");
    expect(
      screen.getByRole("link", { name: "kontakt@example.invalid" }),
    ).toHaveAttribute("href", "mailto:kontakt@example.invalid");
    expect(
      screen.getByRole("link", { name: /Pokaż na mapie/ }),
    ).toHaveAttribute(
      "href",
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("ul. Długa 1, 61-001 Poznań")}`,
    );
    expect(screen.getByText("Pn–Pt 8–20")).toBeInTheDocument();
    expect(
      within(screen.getByText("Godziny otwarcia").parentElement!).getByRole(
        "link",
        { name: "Kontakt" },
      ),
    ).toHaveAttribute("href", "/kontakt");
    expect(
      within(screen.getByText("Adres").parentElement!).getByRole("link", {
        name: /Pokaż na mapie/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mapa oczekuje na zgodę")).toBeInTheDocument();
  });
  it("does not invent missing contact details", () => {
    render(
      <LocationSection header={header} contact={{ address }} map={null} />,
    );
    expect(screen.queryByText("Telefon")).not.toBeInTheDocument();
    expect(screen.queryByText("E-mail")).not.toBeInTheDocument();
    expect(screen.queryByText("Godziny otwarcia")).not.toBeInTheDocument();
    expect(screen.getByText(/ul. Długa 1/)).toBeInTheDocument();
  });
});
