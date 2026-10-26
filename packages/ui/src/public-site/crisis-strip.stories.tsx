import type { Meta, StoryObj } from "@storybook/react";
import { defaultCrisisHelp } from "@repo/contracts";
import { CrisisStrip } from "./crisis-strip";

const meta = {
  title: "Public site/Crisis section",
  component: CrisisStrip,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink py-12">
        <Story />
      </div>
    ),
  ],
  args: {
    ...defaultCrisisHelp,
    more: { href: "/pomoc-w-kryzysie", label: defaultCrisisHelp.moreLabel },
  },
} satisfies Meta<typeof CrisisStrip>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const OneContact: Story = {
  args: { lines: defaultCrisisHelp.lines.slice(0, 1) },
};
export const SixLongContacts: Story = {
  args: {
    heading: "Potrzebujesz rozmowy i wsparcia w trudnym momencie?",
    lines: Array.from({ length: 6 }, (_, index) => ({
      number: `123 456 00${index}`,
      label:
        "Przykładowa długa nazwa instytucji udzielającej pomocy i wsparcia",
      detail:
        "Przykładowy opis dostępności, który może zawijać się do kilku wierszy.",
    })),
  },
};
