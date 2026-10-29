import { plainHeader } from "@repo/contracts/section-header";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoomsPeek } from "./rooms-peek";
const header = plainHeader({
  eyebrow: "Nasze gabinety",
  title: "Zajrzyj do środka",
});
const photos = [
  { url: "/a.webp", alt: "Zielony, fotel", room: "Zielony", roomId: "a" },
  {
    url: "/b.webp",
    alt: "Różowy, okno",
    room: "Różowy",
    roomId: "b",
    description: "Widok okna",
  },
  { url: "/c.webp", alt: "Różowy, regał", room: "Różowy", roomId: "b" },
];
describe("RoomsPeek", () => {
  it("switches complete rooms using buttons and arrow keys", () => {
    render(<RoomsPeek header={header} photos={photos} />);
    const row = screen.getByRole("list", {
      name: "Zdjęcia gabinetów",
    }).parentElement!;
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Pokaż gabinet: Zielony" }),
    ).toHaveAttribute("aria-current", "true");
    fireEvent.click(screen.getByRole("button", { name: "Następny gabinet" }));
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(
      screen.getByRole("img", { name: "Różowy, regał" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Zielony, fotel" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Poprzedni gabinet" }));
    expect(screen.getAllByRole("img")).toHaveLength(1);
    fireEvent.keyDown(row, { key: "ArrowLeft" });
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Pokaż gabinet: Różowy" }),
    ).toHaveAttribute("aria-current", "true");
    fireEvent.click(
      screen.getByRole("button", { name: "Pokaż gabinet: Zielony" }),
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Pokaż gabinet: Różowy" }),
    ).not.toHaveAttribute("aria-current");
  });
  it("hides arrows for one room even with several photos", () => {
    render(<RoomsPeek header={header} photos={photos.slice(1)} />);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getAllByTitle("Różowy")).toHaveLength(2);
    expect(screen.getAllByText("Widok okna")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("distinguishes rooms with the same name by ID", () => {
    render(
      <RoomsPeek
        header={header}
        photos={photos
          .slice(1)
          .map((photo, i) => ({ ...photo, roomId: String(i) }))}
      />,
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Następny gabinet" }));
    expect(
      screen.getByRole("img", { name: "Różowy, regał" }),
    ).toBeInTheDocument();
  });
  it("renders nothing without photos", () => {
    const { container } = render(<RoomsPeek header={header} photos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
