import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const meta = {
  title: "Primitives/Avatar",
  component: Avatar,
  tags: ["autodocs"],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>AK</AvatarFallback>
    </Avatar>
  ),
};

export const ImageFallback: Story = {
  render: () => (
    <Avatar className="size-16">
      <AvatarImage alt="Anna Kowalska" src="/missing-avatar.jpg" />
      <AvatarFallback delayMs={100}>AK</AvatarFallback>
    </Avatar>
  ),
};
