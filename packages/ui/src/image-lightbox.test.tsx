import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ImageLightbox } from "./image-lightbox";

const images = [
  { url: "/a.jpg", alt: "Zdjęcie 1 z 3" },
  { url: "/b.jpg", alt: "Zdjęcie 2 z 3" },
  { url: "/c.jpg", alt: "Zdjęcie 3 z 3" },
];

function Viewer({ start = 0 }: { start?: number }) {
  const [index, setIndex] = useState<number | null>(start);
  return (
    <ImageLightbox
      images={images}
      index={index}
      label="Zdjęcia gabinetu"
      onIndexChange={setIndex}
    />
  );
}

describe("ImageLightbox", () => {
  it("shows the photo large, with where it is in the set", () => {
    render(<Viewer start={1} />);
    const dialog = screen.getByRole("dialog", { name: "Zdjęcia gabinetu" });
    expect(dialog).toHaveTextContent("2 z 3");
    expect(screen.getByRole("img", { name: "Zdjęcie 2 z 3" })).toHaveAttribute(
      "src",
      "/b.jpg",
    );
  });

  it("goes to the next and previous, round; the arrows too", async () => {
    const user = userEvent.setup();
    render(<Viewer start={2} />);
    await user.click(screen.getByRole("button", { name: "Następne zdjęcie" }));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/a.jpg");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/c.jpg");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/a.jpg");
    await user.click(
      screen.getByRole("button", { name: "Poprzednie zdjęcie" }),
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "/c.jpg");
  });

  it("closes with the button and with Escape", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Viewer />);
    await user.click(screen.getByRole("button", { name: "Zamknij podgląd" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();
    render(<Viewer />);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("one photo: no way to the others", () => {
    render(
      <ImageLightbox
        images={images.slice(0, 1)}
        index={0}
        label="Zdjęcia"
        onIndexChange={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Następne zdjęcie" }),
    ).toBeNull();
  });
});
