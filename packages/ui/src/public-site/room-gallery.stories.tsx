import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { RoomGallery } from "./room-gallery";

const photos = [
  { url: "/kolor-sensu/room.jpg", alt: "Gabinet Zielony: fotele przy oknie" },
  {
    url: "/kolor-sensu/therapy-room-upload.png",
    alt: "Gabinet Zielony: kącik do rozmowy",
  },
  { url: "/kolor-sensu/group.jpg", alt: "Gabinet Zielony: sala grupowa" },
];

const meta = {
  title: "Public site/RoomGallery",
  component: RoomGallery,
  args: { label: "Zdjęcia: Gabinet Zielony", photos },
  parameters: { controls: { disable: true } },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RoomGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Photos: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Pokaż zdjęcie 3 z 3" }),
    );
    await expect(
      canvas.getByRole("img", { name: "Gabinet Zielony: sala grupowa" }),
    ).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Następne zdjęcie" }),
    );
    await expect(
      canvas.getByRole("img", { name: "Gabinet Zielony: fotele przy oknie" }),
    ).toBeInTheDocument();
  },
};

export const SinglePhoto: Story = {
  args: { photos: [photos[0]!] },
};
