import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImageCropDialog } from "./image-crop-dialog";

// jsdom does not load images: give the photo its size by hand.
function loadPhoto(width = 1200, height = 1600) {
  const photo = screen.getByTestId("crop-photo") as HTMLImageElement;
  Object.defineProperty(photo, "naturalWidth", { value: width });
  Object.defineProperty(photo, "naturalHeight", { value: height });
  fireEvent.load(photo);
  return photo;
}

function renderDialog(
  props: Partial<Parameters<typeof ImageCropDialog>[0]> = {},
) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ImageCropDialog
      imageUrl="/anna.jpg"
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open
      title="Dopasuj zdjęcie profilowe"
      {...props}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("ImageCropDialog", () => {
  it("shows the photo in a labelled crop frame with a zoom control", () => {
    renderDialog();
    loadPhoto();

    expect(
      screen.getByRole("dialog", { name: "Dopasuj zdjęcie profilowe" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Kadr zdjęcia" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("slider", { name: "Przybliżenie" })).toHaveValue(
      "1",
    );
  });

  it("moves the photo with the arrow keys within the frame", () => {
    renderDialog();
    const photo = loadPhoto();
    const frame = screen.getByRole("group", { name: "Kadr zdjęcia" });
    const top = () => Number.parseFloat(photo.style.top);

    const start = top();
    fireEvent.keyDown(frame, { key: "ArrowDown" });
    expect(top()).toBe(start + 10);

    // The photo never uncovers the frame: 48 px of slack at zoom 1.
    for (let step = 0; step < 10; step += 1) {
      fireEvent.keyDown(frame, { key: "ArrowDown" });
    }
    expect(top()).toBe(0);
  });

  it("zooms with the slider and recentres with the reset button", async () => {
    const user = userEvent.setup();
    renderDialog();
    const photo = loadPhoto();
    const slider = screen.getByRole("slider", { name: "Przybliżenie" });

    fireEvent.change(slider, { target: { value: "2" } });
    expect(Number.parseFloat(photo.style.width)).toBe(576);

    await user.click(screen.getByRole("button", { name: "Wyśrodkuj" }));
    expect(slider).toHaveValue("1");
    expect(Number.parseFloat(photo.style.width)).toBe(288);
  });

  it("uses a 3:4 frame for portraits", () => {
    renderDialog({ aspect: "portrait" });
    loadPhoto();

    expect(screen.getByRole("group", { name: "Kadr zdjęcia" })).toHaveStyle({
      width: "288px",
      height: "384px",
    });
  });

  it("uses a 3:2 frame for room photos", () => {
    renderDialog({ aspect: "landscape" });
    loadPhoto(1600, 1200);

    expect(screen.getByRole("group", { name: "Kadr zdjęcia" })).toHaveStyle({
      width: "288px",
      height: "192px",
    });
  });

  it("closes without saving on cancel", async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = renderDialog();
    loadPhoto();

    await user.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps saving disabled until the photo has loaded", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Zapisz kadr" })).toBeDisabled();
    loadPhoto();
    expect(screen.getByRole("button", { name: "Zapisz kadr" })).toBeEnabled();
  });
});

describe("ImageCropDialog focus", () => {
  it("returns focus to the button that opened it", async () => {
    const { useState } = await import("react");
    function Opener() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Otwórz
          </button>
          <ImageCropDialog
            imageUrl="/anna.jpg"
            onConfirm={() => {}}
            onOpenChange={setOpen}
            open={open}
            title="Kadr"
          />
        </>
      );
    }
    const user = userEvent.setup();
    render(<Opener />);

    const opener = screen.getByRole("button", { name: "Otwórz" });
    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(opener).toHaveFocus();
  });
});
