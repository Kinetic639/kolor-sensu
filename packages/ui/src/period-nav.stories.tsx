import type { Meta, StoryObj } from "@storybook/react";
import { PeriodNav } from "./period-nav";

const meta = {
  title: "Portal/Period nav",
  component: PeriodNav,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof PeriodNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Week: Story = {
  args: {
    label: "28 września – 4 października 2026",
    previousHref: "#poprzedni",
    nextHref: "#nastepny",
    todayHref: "#dzis",
  },
};

export const CurrentDay: Story = {
  args: {
    label: "środa, 30 września",
    previousHref: "#poprzedni",
    nextHref: "#nastepny",
    unit: "dzień",
  },
};
