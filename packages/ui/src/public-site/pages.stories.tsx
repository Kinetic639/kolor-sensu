import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";
import { CookieConsent } from "./cookie-consent";
import { FaqSection } from "./faq-section";
import { sampleRooms } from "./feature-samples";
import { FeatureSection } from "./feature-section";
import { HomepageSections } from "./homepage-sample";
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
import { EditorialHeading, SectionEyebrow } from "./typography";

// Complete pages: the site's frame (skip link, header with navigation,
// footer, structured data) around the sections. Reference A.

const site = {
  navigation: sampleNavigation,
  cta: sampleCta,
  contact: sampleContact,
  socials: sampleSocials,
  legal: sampleLegal,
  about: sampleAbout,
  siteUrl: "https://kolorsensu.pl",
  year: 2026,
} satisfies Omit<SiteLayoutProps, "children">;

function Homepage({ cookies = false }: { cookies?: boolean }) {
  return (
    <SiteLayout {...site} currentPath="/">
      <HomepageSections />
      {cookies ? <CookieConsent forceOpen /> : null}
    </SiteLayout>
  );
}

const meta = {
  title: "Public site/Pages",
  component: Homepage,
  parameters: { canvasPadding: false },
} satisfies Meta<typeof Homepage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The home page, complete: header, every section, FAQ, footer. */
export const HomepageDesktop: Story = {
  name: "Homepage · Desktop",
  globals: { viewport: { value: "desktop", isRotated: false } },
};

export const HomepageTablet: Story = {
  name: "Homepage · Tablet",
  globals: { viewport: { value: "tablet", isRotated: false } },
};

export const HomepageMobile: Story = {
  name: "Homepage · Mobile",
  globals: { viewport: { value: "mobile", isRotated: false } },
};

/** A first visit: the cookie notice in the lower corner. */
export const HomepageFirstVisit: Story = {
  name: "Homepage · First visit (cookies)",
  args: { cookies: true },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** The phone menu, opened. */
export const HomepageMobileMenu: Story = {
  name: "Homepage · Mobile menu open",
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Otwórz menu" }));
  },
};

/** A subpage: its own H1, a section and the offer's FAQ. */
export const Subpage: Story = {
  name: "Subpage · Desktop",
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => (
    <SiteLayout {...site} currentPath="/oferta/psychoterapia-par">
      <div className="max-w-page px-gutter mx-auto grid gap-5 pt-8 pb-4 lg:pt-12">
        <SectionEyebrow className="text-pink-strong">Oferta</SectionEyebrow>
        <EditorialHeading
          as="h1"
          accent="Razem, ale każde po swojemu."
          accentTone="primary"
        >
          Psychoterapia par
        </EditorialHeading>
        <p className="max-w-copy text-lead text-text-muted">
          Spotkania dla par, które chcą lepiej się rozumieć, rozmawiać bez
          ranienia i odbudować bliskość.
        </p>
      </div>
      <FeatureSection
        {...sampleRooms}
        eyebrow="Jak pracujemy"
        heading="Spokojna rozmowa, bez oceniania"
        description="Na pierwszym spotkaniu poznajemy Waszą historię i to, co chcecie zmienić. Razem ustalamy cel i rytm spotkań."
        cta={{ href: "/umow-wizyte", label: "Umów konsultację dla pary" }}
        animationPreset="watercolor-reveal"
      />
      <FaqSection
        items={sampleFaq.slice(0, 3)}
        heading="Pytania o terapię par"
      />
    </SiteLayout>
  ),
};

export const SubpageMobile: Story = {
  ...Subpage,
  name: "Subpage · Mobile",
  globals: { viewport: { value: "mobile", isRotated: false } },
};
