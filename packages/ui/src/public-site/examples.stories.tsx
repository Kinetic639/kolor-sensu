import type { Meta, StoryObj } from "@storybook/react";
import { HomepageSections } from "./homepage-sample";

// Isolated composition used to check the sections against reference A,
// without the site's header and footer (see Public site/Pages for the full
// page). It is not a page: no routing, data or copy decisions live here.

function HomepageFragment() {
  return (
    <div className="bg-bg font-body text-ink overflow-x-clip">
      <HomepageSections faq={false} />
    </div>
  );
}

const meta = {
  title: "Public site/Examples",
  component: HomepageFragment,
  parameters: { canvasPadding: false },
} satisfies Meta<typeof HomepageFragment>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HomepageFragmentDesktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

export const HomepageFragmentMobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
