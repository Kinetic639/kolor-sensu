import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { FirstSteps } from "./first-steps";

// FirstSteps ("Pierwszy krok"): four steps of starting therapy on a compact
// band. Scroll: the brush stroke behind fills in from both sides to the
// middle as the band comes up; the band then holds in the middle of the
// screen while the wave draws itself, a drop of paint at its tip, and each
// grey step takes colour as the line reaches it (the wash spreads, a ring
// ripples out, the sentence comes up; the sprout grows; coloured circles
// breathe). Under reduced motion it is simply the finished band.

const meta = {
  title: "Public site/First steps",
  component: FirstSteps,
  parameters: { layout: "fullscreen" },
  args: {
    eyebrow: "Pierwszy krok",
    heading: "Od pierwszego kontaktu do wsparcia na dłużej",
    steps: [
      {
        title: "Kontakt",
        text: "Umawiasz się na dogodny termin: telefonicznie, przez formularz lub online.",
      },
      {
        title: "Pierwsze spotkanie",
        text: "Rozmawiamy o Twoich potrzebach, pytaniach i oczekiwaniach.",
      },
      {
        title: "Wspólny plan",
        text: "Proponujemy możliwe formy wsparcia i dalsze kroki.",
      },
      {
        title: "Rozpoczęcie pracy",
        text: "Zaczynamy proces terapeutyczny w Twoim tempie i w bezpiecznej atmosferze.",
      },
    ],
  },
} satisfies Meta<typeof FirstSteps>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Scroll down slowly: the band holds mid-screen while the wave runs. Once
 * past, it stays finished and no longer holds.
 */
export const ScrollToPaint: Story = {
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink">
        <div className="text-text-muted grid h-[110vh] place-items-center">
          Przewiń w dół
        </div>
        <Story />
        <div className="h-[80vh]" />
      </div>
    ),
  ],
};

/** The finished band (what reduced motion and no script show). */
export const Finished: Story = {
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("listitem")).toHaveLength(4);
    await expect(
      canvas.getByRole("heading", { level: 3, name: "Kontakt" }),
    ).toBeInTheDocument();
  },
};
