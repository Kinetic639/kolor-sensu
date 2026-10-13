import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { CursorRing } from "./cursor-ring";
import { ThoughtsLens } from "./thoughts-lens";
import { sampleThoughts } from "./thoughts-samples";

// ThoughtsLens: a crowd of negative thoughts in powder pink, outlined and
// filled by turns, two rows drifting apart as the band scrolls by. Each
// hides a positive thought: point at one (or tap it) and it dissolves like
// mist while the positive one condenses in its place, in sage green; the
// crowd makes room. A thought once turned stays so until the page is
// loaded again.

const paper: Decorator = (Story) => (
  <div className="bg-bg font-body text-ink min-h-[180vh] py-[40vh]">
    <Story />
  </div>
);

const meta = {
  title: "Public site/Thoughts lens",
  component: ThoughtsLens,
  decorators: [paper],
  parameters: { layout: "fullscreen" },
  args: sampleThoughts,
} satisfies Meta<typeof ThoughtsLens>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Point at the pink thoughts: each one you touch turns green. Scroll to see
 * the rows drift apart.
 */
export const Playground: Story = {
  render: (args) => (
    <>
      <ThoughtsLens {...args} />
      <CursorRing />
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    const band = canvas.getByRole("region", { name: sampleThoughts.label });
    const [first, second] =
      band.querySelectorAll<HTMLElement>(".ks-thoughts__word");
    await userEvent.hover(first!);
    await expect(first).toHaveAttribute("data-found");
    await expect(second).not.toHaveAttribute("data-found");
    // It stays turned once the pointer moves on.
    await userEvent.unhover(first!);
    await expect(first).toHaveAttribute("data-found");
  },
};
