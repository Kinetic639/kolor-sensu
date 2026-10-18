import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CookieConsent } from "./cookie-consent";
import { FaqSection } from "./faq-section";
import { JsonLd } from "./json-ld";
import { SiteBreadcrumbs } from "./site-breadcrumbs";
import { SiteLayout, type SiteLayoutProps } from "./site-layout";
import {
  sampleAbout,
  sampleContact,
  sampleCta,
  sampleFaq,
  sampleLegal,
  sampleNavigation,
  sampleSocials,
} from "./site-samples";

const here = dirname(fileURLToPath(import.meta.url));
const webApp = resolve(here, "../../../../apps/web");

const site = {
  navigation: sampleNavigation,
  cta: sampleCta,
  contact: sampleContact,
  socials: sampleSocials,
  legal: sampleLegal,
  about: sampleAbout,
  year: 2026,
} satisfies Omit<SiteLayoutProps, "children">;

function page(props: Partial<SiteLayoutProps> = {}) {
  return (
    <SiteLayout {...site} {...props}>
      <h1>Treść strony</h1>
    </SiteLayout>
  );
}

function jsonLd(container: ParentNode) {
  return Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
    (script) => JSON.parse(script.textContent!) as Record<string, unknown>,
  );
}

afterEach(() => {
  window.localStorage.clear();
});

describe("SiteLayout's announcement", () => {
  it("a narrow bar above the header, after the skip link, its link beside it", () => {
    const { container } = render(
      page({
        announcement: {
          id: "a-1",
          message: "W dniach 19–23 grudnia centrum jest nieczynne.",
          link: { label: "Szczegóły", href: "/kontakt" },
        },
      }),
    );
    const bar = screen.getByRole("region", { name: "Ogłoszenie" });
    expect(bar).toHaveTextContent(
      "W dniach 19–23 grudnia centrum jest nieczynne.",
    );
    expect(
      within(bar).getByRole("link", { name: "Szczegóły" }),
    ).toHaveAttribute("href", "/kontakt");
    // Before the header, after the skip link.
    const header = screen.getByRole("banner");
    expect(
      bar.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.querySelector("a")).toHaveTextContent("Przejdź do treści");
  });

  it("none: no bar", () => {
    render(page());
    expect(screen.queryByRole("region", { name: "Ogłoszenie" })).toBeNull();
  });
});

describe("SiteLayout's company", () => {
  it("the company's line in the footer, under the copyright", () => {
    render(
      page({
        company:
          "Kolor Sensu sp. z o.o., ul. Długa 1, 61-001 Poznań · NIP 123-456-32-18",
      }),
    );
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Kolor Sensu sp. z o.o., ul. Długa 1, 61-001 Poznań · NIP 123-456-32-18",
    );
  });
});

describe("SiteLayout", () => {
  it("lays the page out in landmarks, with a skip link to the content first", () => {
    const { container } = render(page());
    const skip = screen.getByRole("link", { name: "Przejdź do treści" });
    expect(container.querySelector("a")).toBe(skip);
    expect(skip).toHaveAttribute("href", "#tresc");
    expect(screen.getByRole("main")).toHaveAttribute("id", "tresc");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("brings the mouse's ring along on every page, hidden from assistive tech", () => {
    const { container } = render(page());
    expect(container.querySelector(".ks-cursor")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("puts the logo, linking home, in the header", () => {
    render(page());
    const header = screen.getByRole("banner");
    // The name and the tagline are the link text; the mark is decorative.
    const home = within(header).getByRole("link", {
      name: "Kolor Sensu, Centrum psychoterapii i rozwoju",
    });
    expect(home).toHaveAttribute("href", "/");
    // Named by what it shows (WCAG 2.5.3), not by a label over it.
    expect(home).not.toHaveAttribute("aria-label");
    expect(home.querySelector("img")).toHaveAttribute("alt", "");
    expect(home.querySelector("img")!.getAttribute("src")).toContain(
      "logo-mark.png",
    );
    // "Sensu" in the brand green, in the footer's logo too.
    expect(within(home).getByText("Sensu")).toHaveClass("text-primary");
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText("Sensu", { selector: "span" })).toHaveClass(
      "text-primary",
    );
    expect(footer).toHaveTextContent("Centrum psychoterapii i rozwoju");
  });

  it("keeps the header low: 56 px on phones, 64 px from 64 rem", () => {
    render(page());
    const bar = screen.getByRole("banner").firstElementChild!;
    expect(bar).toHaveClass("h-14", "lg:h-16");
  });

  it("links every page from the main navigation and marks the current one", () => {
    render(page({ currentPath: "/warsztaty" }));
    const nav = within(screen.getByRole("banner")).getByRole("navigation", {
      name: "Główna",
    });
    for (const item of sampleNavigation.filter((i) => !("children" in i))) {
      expect(
        within(nav).getByRole("link", { name: item.label }),
      ).toHaveAttribute("href", item.href);
    }
    const current = within(nav).getByRole("link", { name: "Warsztaty" });
    expect(current).toHaveAttribute("aria-current", "page");
    // ...and shows it: Radix marks the link with aria-current, not with
    // data-active="true".
    expect(current).toHaveClass("aria-[current=page]:text-primary-strong");
    // "O nas" opens the team, the rooms and the contact; "Oferta" its services.
    expect(
      within(nav).getByRole("button", { name: "O nas" }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("button", { name: "Oferta" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: "Umów wizytę",
      }),
    ).toHaveAttribute("href", "/umow-wizyte");
  });

  it("opens the phone menu with every page, the services and the booking action", async () => {
    const user = userEvent.setup();
    render(page({ currentPath: "/o-nas" }));
    await user.click(screen.getByRole("button", { name: "Otwórz menu" }));
    const menu = await screen.findByRole("dialog");
    // The same logo as the header: green "Sensu" and the tagline.
    expect(within(menu).getByText("Sensu")).toHaveClass("text-primary");
    expect(
      within(menu).getByText("Centrum psychoterapii i rozwoju"),
    ).toBeInTheDocument();
    for (const label of ["O nas", "Oferta", "Psychoterapia par", "Kontakt"]) {
      expect(
        within(menu).getByRole("link", { name: label }),
      ).toBeInTheDocument();
    }
    expect(within(menu).getByRole("link", { name: "O nas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(menu).getByRole("link", { name: "Umów wizytę" }),
    ).toBeInTheDocument();
    await user.click(within(menu).getByRole("link", { name: "Cennik" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("gives the footer real contact details, social profiles and legal links", () => {
    render(page());
    const footer = screen.getByRole("contentinfo");
    const address = footer.querySelector("address")!;
    expect(address).toHaveTextContent("ul. Przykładowa 10");
    expect(address).toHaveTextContent("00-001 Warszawa");
    expect(
      within(address).getByRole("link", { name: "+48 123 456 789" }),
    ).toHaveAttribute("href", "tel:+48123456789");
    expect(
      within(address).getByRole("link", { name: "kontakt@kolorsensu.pl" }),
    ).toHaveAttribute("href", "mailto:kontakt@kolorsensu.pl");
    expect(
      within(footer).getByRole("link", { name: "Kolor Sensu: Instagram" }),
    ).toHaveAttribute("rel", "me noopener");
    for (const link of sampleLegal) {
      expect(
        within(footer).getByRole("link", { name: link.label }),
      ).toHaveAttribute("href", link.href);
    }
    expect(footer).toHaveTextContent("© 2026 Kolor Sensu");
    // Every service is linked from the footer too.
    const offer = within(footer).getByRole("navigation", { name: "Oferta" });
    expect(within(offer).getAllByRole("link")).toHaveLength(4);
  });

  it("describes the centre as structured data when the site's origin is known", () => {
    const { container, rerender } = render(page());
    expect(jsonLd(container)).toHaveLength(0);
    rerender(page({ siteUrl: "https://kolorsensu.pl" }));
    const [business] = jsonLd(container);
    expect(business).toMatchObject({
      "@type": "MedicalBusiness",
      name: "Kolor Sensu",
      url: "https://kolorsensu.pl",
      telephone: "+48123456789",
      address: { addressLocality: "Warszawa", addressCountry: "PL" },
    });
    expect(business!.logo).toBe("https://kolorsensu.pl/brand/logo-mark.png");
  });

  it("renders on the server with the navigation in the HTML", () => {
    const html = renderToString(page());
    expect(html).toContain('href="/specjalisci"');
    expect(html).toContain('href="/kontakt"');
    expect(html).toContain('id="tresc"');
  });
});

describe("SiteBreadcrumbs", () => {
  it("shows the trail and publishes it as a BreadcrumbList", () => {
    const { container } = render(
      <SiteBreadcrumbs
        siteUrl="https://kolorsensu.pl"
        items={[
          { label: "Strona główna", href: "/" },
          { label: "Oferta", href: "/oferta" },
          { label: "Psychoterapia par" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Okruszki" });
    expect(within(nav).getByRole("link", { name: "Oferta" })).toHaveAttribute(
      "href",
      "/oferta",
    );
    expect(within(nav).getByText("Psychoterapia par")).toHaveAttribute(
      "aria-current",
      "page",
    );
    const [list] = jsonLd(container);
    expect(list).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Strona główna", item: "https://kolorsensu.pl/" },
        {
          position: 2,
          name: "Oferta",
          item: "https://kolorsensu.pl/oferta",
        },
        { position: 3, name: "Psychoterapia par" },
      ],
    });
  });
});

describe("FaqSection", () => {
  it("keeps every answer in the HTML and publishes them as an FAQPage", () => {
    const html = renderToString(<FaqSection items={sampleFaq} />);
    for (const item of sampleFaq) expect(html).toContain(item.answer);

    const { container } = render(<FaqSection items={sampleFaq} />);
    const [faq] = jsonLd(container);
    expect(faq).toMatchObject({
      "@type": "FAQPage",
      mainEntity: sampleFaq.map((item) => ({
        name: item.question,
        acceptedAnswer: { text: item.answer },
      })),
    });
  });

  it("opens an answer when its question is chosen", async () => {
    const user = userEvent.setup();
    render(<FaqSection items={sampleFaq} />);
    const question = screen.getByRole("button", {
      name: sampleFaq[0].question,
    });
    expect(question).toHaveAttribute("aria-expanded", "false");
    await user.click(question);
    expect(question).toHaveAttribute("aria-expanded", "true");
  });
});

describe("CookieConsent", () => {
  it("asks once, remembers the choice and reports it", async () => {
    const user = userEvent.setup();
    const onChoice = vi.fn();
    const { unmount } = render(<CookieConsent onChoice={onChoice} />);
    const notice = await screen.findByRole("region", { name: "Pliki cookies" });
    await user.click(
      within(notice).getByRole("button", { name: "Tylko niezbędne" }),
    );
    expect(onChoice).toHaveBeenCalledWith("necessary");
    expect(window.localStorage.getItem("ks-cookie-consent")).toBe("necessary");
    expect(screen.queryByRole("region", { name: "Pliki cookies" })).toBeNull();
    unmount();

    render(<CookieConsent />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("region", { name: "Pliki cookies" })).toBeNull();
  });

  it("is not in the server HTML, so it never delays the first paint", () => {
    expect(renderToString(<CookieConsent />)).toBe("");
  });
});

describe("JsonLd", () => {
  it("cannot be closed early by the data it carries", () => {
    const html = renderToString(
      <JsonLd data={{ name: "</script><script>alert(1)</script>" }} />,
    );
    expect(html).not.toContain("</script><script>");
    expect(html).toContain("\\u003c/script>");
  });
});

describe("site icons", () => {
  it("ships the favicon, icon and Apple touch icon by Next.js convention", () => {
    for (const file of ["favicon.ico", "icon.png", "apple-icon.png"]) {
      expect(existsSync(resolve(webApp, "src/app", file)), file).toBe(true);
    }
    expect(existsSync(resolve(webApp, "src/app/icon.svg"))).toBe(false);
    const ico = readFileSync(resolve(webApp, "src/app/favicon.ico"));
    // ICO header: reserved 0, type 1 (icon), three images (16, 32, 48).
    expect([
      ico.readUInt16LE(0),
      ico.readUInt16LE(2),
      ico.readUInt16LE(4),
    ]).toEqual([0, 1, 3]);
    expect(existsSync(resolve(webApp, "public/brand/logo-mark.png"))).toBe(
      true,
    );
  });
});
