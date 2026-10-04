import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  SortableImageGallery,
  type SortableImageGalleryProps,
} from "./sortable-image-gallery";

const images = [
  { id: "a", url: "/a.jpg", isMain: false },
  { id: "b", url: "/b.jpg", isMain: true },
  { id: "c", url: "/c.jpg", isMain: false },
];

function renderGallery(props: Partial<SortableImageGalleryProps> = {}) {
  const callbacks = {
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onReorder: vi.fn(),
    onSetMain: vi.fn(),
  };
  render(
    <SortableImageGallery
      images={images}
      label="Zdjęcia gabinetu"
      {...callbacks}
      {...props}
    />,
  );
  return callbacks;
}

describe("SortableImageGallery", () => {
  it("lists the photos in order and marks the main one", () => {
    renderGallery();

    const items = within(
      screen.getByRole("list", { name: "Zdjęcia gabinetu" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByRole("img")).toHaveAttribute("src", "/a.jpg");
    expect(within(items[1]!).getByText("Zdjęcie główne")).toBeInTheDocument();
    expect(screen.getByText("3 z 5 zdjęć")).toBeInTheDocument();
  });

  it("gives every photo a keyboard-accessible drag handle", () => {
    renderGallery();

    expect(
      screen.getByRole("button", { name: "Przesuń zdjęcie 1" }),
    ).toHaveAttribute("aria-describedby");
  });

  it("marks another photo as the main one", async () => {
    const user = userEvent.setup();
    const { onSetMain } = renderGallery();

    expect(
      screen.queryByRole("button", { name: "Ustaw jako główne: zdjęcie 2" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Ustaw jako główne: zdjęcie 3" }),
    );

    expect(onSetMain).toHaveBeenCalledWith("c");
  });

  it("asks before removing a photo", async () => {
    const user = userEvent.setup();
    const { onRemove } = renderGallery();

    await user.click(screen.getByRole("button", { name: "Usuń zdjęcie 1" }));
    expect(onRemove).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Usuń zdjęcie" }));

    expect(onRemove).toHaveBeenCalledWith("a");
  });

  it("passes a chosen file to onAdd", async () => {
    const user = userEvent.setup();
    const { onAdd } = renderGallery();
    const file = new File(["x"], "room.jpg", { type: "image/jpeg" });

    await user.upload(
      screen.getByLabelText("Dodaj zdjęcie: wybierz plik"),
      file,
    );

    expect(onAdd).toHaveBeenCalledWith(file);
  });

  it("stops offering new photos at the limit", () => {
    renderGallery({
      images: ["a", "b", "c", "d", "e"].map((id, index) => ({
        id,
        url: `/${id}.jpg`,
        isMain: index === 0,
      })),
    });

    expect(
      screen.queryByRole("button", { name: /Dodaj zdjęcie/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("5 z 5 zdjęć")).toBeInTheDocument();
  });

  it("explains an empty gallery", () => {
    renderGallery({ images: [] });
    expect(
      screen.getByText("Dodaj pierwsze zdjęcie. Pierwsze stanie się główne."),
    ).toBeInTheDocument();
  });

  it("blocks changes while saving", () => {
    renderGallery({ pending: true });
    expect(
      screen.getByRole("button", { name: "Ustaw jako główne: zdjęcie 1" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Usuń zdjęcie 1" }),
    ).toBeDisabled();
  });

  it("opens a photo on the whole screen, and moves on to the next", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(
      screen.getByRole("button", { name: "Powiększ zdjęcie 2" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Zdjęcia gabinetu" });
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", "/b.jpg");
    await user.click(
      within(dialog).getByRole("button", { name: "Następne zdjęcie" }),
    );
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", "/c.jpg");
  });

  it("opens even while saving (only looking)", () => {
    renderGallery({ pending: true });
    expect(
      screen.getByRole("button", { name: "Powiększ zdjęcie 1" }),
    ).toBeEnabled();
  });
});
