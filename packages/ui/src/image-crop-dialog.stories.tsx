import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import { Button } from "./button";
import { ImageCropDialog } from "./image-crop-dialog";

const meta = {
  title: "Portal/Image Crop Dialog",
  component: ImageCropDialog,
  parameters: { controls: { disable: true } },
  args: {
    open: true,
    imageUrl: "/kolor-sensu/anna.jpg",
    title: "Dopasuj zdjęcie profilowe",
    onOpenChange: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof ImageCropDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The avatar crop: a circle over the photo, as it shows on the site. */
export const Avatar: Story = {
  play: async ({ args, userEvent }) => {
    const save = screen.getByRole("button", { name: "Zapisz kadr" });
    await waitFor(() => expect(save).toBeEnabled());

    screen.getByRole("group", { name: "Kadr zdjęcia" }).focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{+}");
    await userEvent.click(save);

    await waitFor(() => expect(args.onConfirm).toHaveBeenCalled());
    const [image] = (args.onConfirm as ReturnType<typeof fn>).mock.calls[0]!;
    await expect(image).toBeInstanceOf(Blob);
    await expect(["image/webp", "image/png"]).toContain((image as Blob).type);
  },
};

// A cut-out portrait: a green disc on a transparent background.
function transparentPhoto() {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 800;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#527b57";
  context.beginPath();
  context.arc(300, 400, 150, 0, Math.PI * 2);
  context.fill();
  return canvas.toDataURL("image/png");
}

/** A photo without background keeps it transparent (no black corners). */
export const TransparentBackground: Story = {
  args: { imageUrl: null },
  render: (args) => <ImageCropDialog {...args} imageUrl={transparentPhoto()} />,
  play: async ({ args, userEvent }) => {
    const save = screen.getByRole("button", { name: "Zapisz kadr" });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    await waitFor(() => expect(args.onConfirm).toHaveBeenCalled());
    const [image] = (args.onConfirm as ReturnType<typeof fn>).mock.calls[0]!;
    const bitmap = await createImageBitmap(image as Blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const [, , , cornerAlpha] = context.getImageData(0, 0, 1, 1).data;
    const [, , , centreAlpha] = context.getImageData(
      bitmap.width / 2,
      bitmap.height / 2,
      1,
      1,
    ).data;
    await expect(cornerAlpha).toBe(0);
    await expect(centreAlpha).toBe(255);
  },
};

/** The 3:4 portrait used on the specialist's page. */
export const Portrait: Story = {
  args: {
    aspect: "portrait",
    title: "Dopasuj zdjęcie portretowe",
  },
};

/** A photo that cannot be loaded: saving stays disabled. */
export const BrokenImage: Story = {
  args: { imageUrl: "/kolor-sensu/missing.jpg" },
};

function DialogFromButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Dopasuj kadr</Button>
      <ImageCropDialog
        imageUrl="/kolor-sensu/anna.jpg"
        onConfirm={() => setOpen(false)}
        onOpenChange={setOpen}
        open={open}
        title="Dopasuj zdjęcie profilowe"
      />
    </>
  );
}

/** Opened from a button and cancelled (focus return is covered by the unit test). */
export const OpenAndCancel: Story = {
  render: () => <DialogFromButton />,
  play: async ({ canvas, userEvent }) => {
    const opener = canvas.getByRole("button", { name: "Dopasuj kadr" });
    await userEvent.click(opener);
    await userEvent.click(
      await screen.findByRole("button", { name: "Anuluj" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};
