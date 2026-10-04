import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  SortableImageGallery,
  type GalleryImage,
} from "./sortable-image-gallery";

const meta = {
  title: "Portal/Sortable Image Gallery",
  parameters: { controls: { disable: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const photos: GalleryImage[] = [
  { id: "room", url: "/kolor-sensu/room.jpg", isMain: true },
  { id: "upload", url: "/kolor-sensu/therapy-room-upload.png", isMain: false },
  { id: "group", url: "/kolor-sensu/group.jpg", isMain: false },
];

const onReorder = fn();

// The gallery is controlled; the page holds the photos, as this wrapper does.
function GalleryWithState({ initial }: { initial: GalleryImage[] }) {
  const [images, setImages] = useState(initial);
  return (
    <div className="max-w-xs">
      <SortableImageGallery
        images={images}
        label="Zdjęcia gabinetu"
        onAdd={(file) =>
          setImages((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              url: URL.createObjectURL(file),
              isMain: current.length === 0,
            },
          ])
        }
        onRemove={(id) =>
          setImages((current) => {
            const rest = current.filter((image) => image.id !== id);
            return rest.some((image) => image.isMain)
              ? rest
              : rest.map((image, index) => ({ ...image, isMain: index === 0 }));
          })
        }
        onReorder={(ids) => {
          onReorder(ids);
          setImages((current) =>
            ids.map((id) => current.find((image) => image.id === id)!),
          );
        }}
        onSetMain={(id) =>
          setImages((current) =>
            current.map((image) => ({ ...image, isMain: image.id === id })),
          )
        }
      />
    </div>
  );
}

export const Gallery: Story = {
  render: () => <GalleryWithState initial={photos} />,
};

/** Reordering with the keyboard alone: lift, move right, drop. */
export const KeyboardReorder: Story = {
  render: () => <GalleryWithState initial={photos} />,
  play: async ({ canvas, userEvent }) => {
    onReorder.mockClear();
    // One photo under another: down moves it to the next place.
    canvas.getByRole("button", { name: "Przesuń zdjęcie 1" }).focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard(" ");

    await waitFor(() =>
      expect(onReorder).toHaveBeenCalledWith(["upload", "room", "group"]),
    );
    await expect(canvas.getByAltText("Zdjęcie 1 z 3")).toHaveAttribute(
      "src",
      "/kolor-sensu/therapy-room-upload.png",
    );
  },
};

export const SetMainPhoto: Story = {
  render: () => <GalleryWithState initial={photos} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Ustaw jako główne: zdjęcie 3" }),
    );
    await expect(canvas.getAllByText("Zdjęcie główne")).toHaveLength(1);
    await expect(
      canvas.queryByRole("button", { name: "Ustaw jako główne: zdjęcie 3" }),
    ).not.toBeInTheDocument();
  },
};

export const Full: Story = {
  render: () => (
    <GalleryWithState
      initial={[
        ...photos,
        { id: "anna", url: "/kolor-sensu/anna.jpg", isMain: false },
        { id: "tomasz", url: "/kolor-sensu/tomasz.jpg", isMain: false },
      ]}
    />
  ),
};

export const Empty: Story = {
  render: () => <GalleryWithState initial={[]} />,
};

export const Saving: Story = {
  render: () => (
    <div className="max-w-xs">
      <SortableImageGallery
        error="Gabinet może mieć najwyżej 5 zdjęć."
        images={photos}
        label="Zdjęcia gabinetu"
        onAdd={() => {}}
        onRemove={() => {}}
        onReorder={() => {}}
        onSetMain={() => {}}
        pending
      />
    </div>
  ),
};

/** A click on a photo shows it on the whole screen; arrows to the others. */
export const Preview: Story = {
  render: () => <GalleryWithState initial={photos} />,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Powiększ zdjęcie 1" }),
    );
    const dialog = within(canvasElement.ownerDocument.body).getByRole(
      "dialog",
      { name: "Zdjęcia gabinetu" },
    );
    await expect(dialog).toHaveTextContent("1 z 3");
    await userEvent.keyboard("{ArrowRight}");
    await expect(dialog).toHaveTextContent("2 z 3");
  },
};
