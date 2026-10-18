import { plainHeader } from "@repo/contracts/section-header";
import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { RoomsPeek } from "./rooms-peek";

const photos = [
  {
    url: "/kolor-sensu/room.jpg",
    alt: "Gabinet Zielony: fotele przy oknie",
    room: "Gabinet Zielony",
  },
  {
    url: "/kolor-sensu/therapy-room-upload.png",
    alt: "Gabinet Różowy: kącik do rozmowy",
    room: "Gabinet Różowy",
  },
  {
    url: "/kolor-sensu/group.jpg",
    alt: "Sala grupowa: krzesła w kręgu",
    room: "Sala grupowa",
  },
  {
    url: "/kolor-sensu/room.jpg",
    alt: "Gabinet Słoneczny: fotel i roślina",
    room: "Gabinet Słoneczny",
  },
];

const meta = {
  title: "Public site/RoomsPeek",
  component: RoomsPeek,
  args: {
    header: plainHeader({
      eyebrow: "Nasze gabinety",
      title: "Zajrzyj do środka",
      description:
        "Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie.",
      cta: {
        label: "Zobacz nasze gabinety",
        href: "/gabinety",
        style: "arrow",
      },
    }),
    photos,
  },
  parameters: { controls: { disable: true }, layout: "fullscreen" },
} satisfies Meta<typeof RoomsPeek>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Photos: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole("list", { name: "Zdjęcia gabinetów" }),
    ).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Następne zdjęcia" }),
    );
  },
};

export const OnePhoto: Story = {
  args: { photos: photos.slice(0, 1) },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("button", { name: "Następne zdjęcia" }),
    ).not.toBeInTheDocument();
  },
};
