import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";
import { CookieConsent } from "./cookie-consent";
import { FaqSection } from "./faq-section";
import { SiteBreadcrumbs } from "./site-breadcrumbs";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Oferta" }));
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

/** The cookie notice, as on a first visit. */
export const CookieNotice: Story = {
  name: "Cookie notice",
  render: () => <CookieConsent forceOpen />,
};
