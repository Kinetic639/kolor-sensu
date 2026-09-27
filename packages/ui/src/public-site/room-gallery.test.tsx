import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RoomGallery } from "./room-gallery";

const photos = [
  { url: "/rooms/a.jpg", alt: "Gabinet Zielony: fotele" },
  { url: "/rooms/b.jpg", alt: "Gabinet Zielony: okno" },
  { url: "/rooms/c.jpg", alt: "Gabinet Zielony: biblioteczka" },
];

const shown = () =>
  screen.getByRole("img", { name: /Gabinet Zielony/ }).getAttribute("alt");

describe("RoomGallery", () => {
  it("starts with the first (main) photo and a thumbnail for each", () => {
    render(<RoomGallery label="Zdjęcia: Gabinet Zielony" photos={photos} />);

    expect(shown()).toBe("Gabinet Zielony: fotele");
    const thumbnails = screen.getAllByRole("button", {
      name: /^Pokaż zdjęcie/,
    });
    expect(thumbnails).toHaveLength(3);
    expect(thumbnails[0]).toHaveAttribute("aria-current", "true");
  });

  it("switches photos with the thumbnails", async () => {
    const user = userEvent.setup();
    render(<RoomGallery label="Zdjęcia: Gabinet Zielony" photos={photos} />);

    await user.click(
      screen.getByRole("button", { name: "Pokaż zdjęcie 3 z 3" }),
    );

    expect(shown()).toBe("Gabinet Zielony: biblioteczka");
    expect(
      screen.getByRole("button", { name: "Pokaż zdjęcie 3 z 3" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("steps through the photos and wraps around", async () => {
    const user = userEvent.setup();
    render(<RoomGallery label="Zdjęcia: Gabinet Zielony" photos={photos} />);

    await user.click(
      screen.getByRole("button", { name: "Poprzednie zdjęcie" }),
    );
    expect(shown()).toBe("Gabinet Zielony: biblioteczka");
    await user.click(screen.getByRole("button", { name: "Następne zdjęcie" }));
    expect(shown()).toBe("Gabinet Zielony: fotele");
  });

  it("shows a single photo without controls", () => {
    render(
      <RoomGallery label="Zdjęcia: Gabinet Zielony" photos={[photos[0]!]} />,
    );

    expect(shown()).toBe("Gabinet Zielony: fotele");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders nothing without photos", () => {
    const { container } = render(
      <RoomGallery label="Zdjęcia: Gabinet Zielony" photos={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
