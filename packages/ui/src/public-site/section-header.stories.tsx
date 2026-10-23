import { plainHeader } from "@repo/contracts/section-header";
import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { SectionHeader } from "./section-header";

// SectionHeader: a section's header from the CMS's words and colours (the
// eyebrow's colour, coloured words anywhere in a one- or two-line title, a
// link anywhere in the description, a call to action under it). The
// heading level, size and alignment are the section's.

const meta = {
  title: "Public site/Section header",
  component: SectionHeader,
  decorators: [
    (Story) => (
      <div className="bg-bg px-gutter font-body text-ink min-h-screen py-16">
        <div className="max-w-page mx-auto">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: { canvasPadding: false },
  argTypes: {
    as: { control: "inline-radio", options: ["h1", "h2", "h3"] },
    size: { control: "inline-radio", options: ["display", "h2", "h3"] },
    align: { control: "inline-radio", options: ["start", "center"] },
  },
  args: {
    content: {
      eyebrow: { text: "Jak zacząć", tone: "pink" },
      title: [
        [
          { text: "Twoja droga do ", tone: "default" },
          { text: "lepszego", tone: "green" },
        ],
        [{ text: "samopoczucia", tone: "default" }],
      ],
      description: [
        { text: "Zaczynamy od ", link: null },
        {
          text: "pierwszej rozmowy",
          link: { href: "/umow-wizyte", tone: "pink" },
        },
        {
          text: ": opowiesz, z czym przychodzisz, a my zaproponujemy formę wsparcia.",
          link: null,
        },
      ],
      cta: { label: "Zobacz ofertę", href: "/oferta", style: "button" },
    },
  },
} satisfies Meta<typeof SectionHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Everything the CMS can set: colours, two lines, a link, a button. */
export const Full: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", {
        level: 2,
        name: "Twoja droga do lepszego samopoczucia",
      }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "pierwszej rozmowy" }),
    ).toHaveAttribute("href", "/umow-wizyte");
  },
};

/** Centred, as in "Obszary wsparcia", with an outlined button. */
export const Centred: Story = {
  args: {
    align: "center",
    content: {
      eyebrow: { text: "Obszary wsparcia", tone: "green" },
      title: [
        [
          { text: "W czym ", tone: "default" },
          { text: "możemy pomóc", tone: "pink" },
        ],
      ],
      description: [
        {
          text: "Wybierz obszar, aby dowiedzieć się więcej.",
          link: null,
        },
      ],
      cta: { label: "Cała oferta", href: "/oferta", style: "outline" },
    },
  },
};

/** The site's own header before the CMS publishes: plain words. */
export const Plain: Story = {
  args: {
    content: plainHeader({
      eyebrow: "Nasze gabinety",
      title: "Przestrzeń, która wspiera",
      description:
        "Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie.",
      cta: { label: "Zobacz gabinety", href: "/gabinety", style: "arrow" },
    }),
  },
};
