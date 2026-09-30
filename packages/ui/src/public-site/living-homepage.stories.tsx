import type { Meta, StoryObj } from "@storybook/react";
import { LivingHomepageSections } from "./living-homepage-sample";
import { SiteLayout, type SiteLayoutProps } from "./site-layout";
import {
  sampleAbout,
  sampleContact,
  sampleCta,
  sampleLegal,
  sampleNavigation,
  sampleSocials,
} from "./site-samples";

// A proposal for a livelier homepage: the current homepage's sections, in
// the same places, over a scroll story (docs §13): a watercolor path
// painted in by the scroll behind the first screens, washes flowing in
// from the sides, subtle parallax and microinteractions, the steps of a
// first visit, a guided choice and one bento section. Scroll the canvas to
// see it; with reduced motion everything is shown painted.

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

function LivingHomepage() {
  return (
    <SiteLayout {...site} currentPath="/">
      <LivingHomepageSections />
    </SiteLayout>
  );
}

const meta = {
  title: "Public site/Living homepage",
  component: LivingHomepage,
  parameters: { canvasPadding: false },
} satisfies Meta<typeof LivingHomepage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 1440 px: the desktop path. */
export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 768 px: the phone's path, stretched to the width. */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** 390 px: the phone's more vertical path. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
