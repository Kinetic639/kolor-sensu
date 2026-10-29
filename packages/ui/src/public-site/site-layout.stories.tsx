import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "../button";
import { CookieConsent } from "./cookie-consent";
import { FaqSection } from "./faq-section";
import { SiteBreadcrumbs } from "./site-breadcrumbs";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SiteIntro } from "./site-intro";
import { SiteLogo } from "./site-logo";
import {
  sampleAbout,
  sampleContact,
  sampleCta,
  sampleFaq,
  sampleLegal,
  sampleNavigation,
  sampleSocials,
} from "./site-samples";

// The site's frame, piece by piece (see Public site/Pages for them
// together). Reference A's header and footer.

const meta = {
  title: "Public site/Layout",
  component: SiteHeader,
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink min-h-[24rem]">
        <Story />
      </div>
    ),
  ],
  parameters: { canvasPadding: false },
  args: {
    navigation: sampleNavigation,
    cta: sampleCta,
    contact: sampleContact,
    currentPath: "/",
  },
} satisfies Meta<typeof SiteHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Logo, navigation with the offer dropdown, booking action. */
export const HeaderDesktop: Story = {
  name: "Header · Desktop",
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** The offer dropdown, opened. */
export const HeaderOfferOpen: Story = {
  name: "Header · Oferta open",
  globals: { viewport: { value: "desktop", isRotated: false } },
  parameters: {
    a11y: {
      // Radix NavigationMenu puts a focus proxy next to an open dropdown: a
      // visually hidden, aria-hidden span that takes Tab focus only to hand
      // it on to the menu. axe's aria-hidden-focus flags it (a known false
      // positive); only that span is left out, the rest of the page is
      // checked as usual.
      context: {
        include: ["body"],
        exclude: ['.ks-site-nav span[aria-hidden="true"][tabindex="0"]'],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Oferta" }));
  },
};

/**
 * A booking begun and left: the action leads back to it ("Dokończ
 * rezerwację"), read from the wizard's cookie in the browser.
 */
export const HeaderResumeBooking: Story = {
  name: "Header · Dokończ rezerwację",
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    cta: {
      ...sampleCta,
      resume: {
        cookie: "ks_rezerwacja_story",
        under: "/umow-wizyte",
        label: "Dokończ rezerwację",
      },
    },
  },
  beforeEach: () => {
    document.cookie = `ks_rezerwacja_story=${encodeURIComponent("/umow-wizyte/dane")}; Path=/`;
    return () => {
      document.cookie = "ks_rezerwacja_story=; Path=/; Max-Age=0";
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("link", { name: "Dokończ rezerwację" }),
    ).toHaveAttribute("href", "/umow-wizyte/dane");
  },
};

/** Tablet: logo, booking action and the menu button. */
export const HeaderTablet: Story = {
  name: "Header · Tablet",
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** Phone: logo and the menu button. */
export const HeaderMobile: Story = {
  name: "Header · Mobile",
  globals: { viewport: { value: "mobile", isRotated: false } },
};

/** The phone menu, opened on "Specjaliści". */
export const HeaderMobileMenu: Story = {
  name: "Header · Mobile menu open",
  args: { currentPath: "/specjalisci" },
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Otwórz menu" }));
  },
};

const footer = (
  <SiteFooter
    navigation={sampleNavigation}
    contact={sampleContact}
    socials={sampleSocials}
    legal={sampleLegal}
    about={sampleAbout}
    year={2026}
  />
);

/** Brand, navigation, offer, contact, social profiles, legal links. */
export const FooterDesktop: Story = {
  name: "Footer · Desktop",
  render: () => footer,
  globals: { viewport: { value: "desktop", isRotated: false } },
};

export const FooterMobile: Story = {
  name: "Footer · Mobile",
  render: () => footer,
  globals: { viewport: { value: "mobile", isRotated: false } },
};

/** The logo in its two sizes: header, and footer with its tagline. */
export const Logo: Story = {
  render: () => (
    <div className="grid gap-8 p-10">
      <SiteLogo />
      <SiteLogo size="lg" tagline="Centrum psychoterapii i rozwoju" />
    </div>
  ),
};

/** On subpages, above the H1. */
export const Breadcrumbs: Story = {
  render: () => (
    <div className="max-w-page px-gutter mx-auto py-10">
      <SiteBreadcrumbs
        items={[
          { label: "Strona główna", href: "/" },
          { label: "Oferta", href: "/oferta" },
          { label: "Psychoterapia par" },
        ]}
      />
    </div>
  ),
};

/** Questions before a first visit; answers in the HTML for search. */
export const Faq: Story = {
  name: "FAQ",
  render: () => (
    <FaqSection
      items={sampleFaq}
      description="Najczęstsze pytania osób, które zastanawiają się nad pierwszą wizytą."
      cta={{ href: "/kontakt", label: "Masz inne pytanie? Napisz do nas" }}
    />
  ),
};

function IntroReplay() {
  const [run, setRun] = useState(0);
  return (
    <>
      <SiteIntro key={run} replay />
      <SiteHeader
        navigation={sampleNavigation}
        cta={sampleCta}
        contact={sampleContact}
        currentPath="/"
      />
      <div className="max-w-page px-gutter mx-auto py-16">
        <Button variant="outline" onClick={() => setRun((n) => n + 1)}>
          Odtwórz intro
        </Button>
      </div>
    </>
  );
}

/**
 * The first-visit intro (about 4.4 s): the bud opens, the penguin rises
 * out of it and "Witaj" writes itself in, over the page it uncovers. On the
 * site it plays once per visitor, never under reduced motion, and the
 * page's reveals start as it fades.
 */
export const Intro: Story = {
  name: "Intro · First visit",
  render: () => <IntroReplay />,
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Odtwórz intro" }),
    );
    await expect(
      canvasElement.querySelector('.ks-intro[data-intro="play"]'),
    ).not.toBeNull();
  },
};

export const IntroMobile: Story = {
  name: "Intro · Mobile",
  render: () => <IntroReplay />,
  globals: { viewport: { value: "mobile", isRotated: false } },
};

/** The cookie notice, as on a first visit. */
export const CookieNotice: Story = {
  name: "Cookie notice",
  render: () => <CookieConsent forceOpen />,
};
