import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor } from "storybook/test";
import { PaintedStory } from "./painted-story";

// PaintedStory: a short story told while scrolling (after David Whyte
// Experience). From 64 rem up, with motion welcome, one screen stays pinned
// while you scroll through the steps: the text changes, the counter's numbers roll,
// and each picture is painted over the previous one with the watercolour
// brush. On phones the steps follow one another, each picture painted in
// as it comes into view; under reduced motion everything simply shows.

const meta = {
  title: "Public site/Painted story",
  component: PaintedStory,
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink">
        <div className="h-[60vh]" />
        <Story />
        <div className="h-[60vh]" />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
  args: {
    eyebrow: "Jak zacząć",
    heading: "Twoja droga do lepszego samopoczucia",
    steps: [
      {
        heading: "Pierwsza rozmowa",
        headingSegments: [
          { text: "Pierwsza ", tone: "default" },
          { text: "rozmowa", tone: "green" },
        ],
        text: "Zaczynamy od konsultacji: rozmawiamy o tym, z czym przychodzisz i czego potrzebujesz. Nie musisz się do niej specjalnie przygotowywać.",
        cta: { href: "#umow", label: "Umów wizytę" },
        image: { src: "/kolor-sensu/room.jpg", alt: "Gabinet" },
      },
      {
        heading: "Przestrzeń, która wspiera",
        text: "Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie i poczuciu bezpieczeństwa.",
        cta: { href: "#gabinety", label: "Zobacz nasze gabinety" },
        image: {
          src: "/kolor-sensu/therapy-room-upload.png",
          alt: "Gabinet z fotelem",
        },
      },
      {
        heading: "Wydarzenia, które inspirują",
        text: "Warsztaty, grupy rozwojowe i spotkania tematyczne dla osób, które chcą lepiej siebie rozumieć.",
        cta: { href: "#warsztaty", label: "Zobacz nadchodzące wydarzenia" },
        image: { src: "/kolor-sensu/group.jpg", alt: "Warsztat w kręgu" },
      },
    ],
  },
} satisfies Meta<typeof PaintedStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Scroll down through it: the screen pins and the pictures paint in. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", {
        level: 2,
        name: "Twoja droga do lepszego samopoczucia",
      }),
    ).toBeVisible();
    await waitFor(() =>
      expect(canvas.getAllByRole("heading", { level: 3 })).toHaveLength(3),
    );
  },
};
