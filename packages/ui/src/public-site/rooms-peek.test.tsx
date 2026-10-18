import { plainHeader } from "@repo/contracts/section-header";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomsPeek } from "./rooms-peek";

const header = plainHeader({
  eyebrow: "Nasze gabinety",
  title: "Zajrzyj do środka",
  cta: { label: "Zobacz nasze gabinety", href: "/gabinety", style: "arrow" },
});

const photos = [
  { url: "/a.webp", alt: "Gabinet Zielony, fotel", room: "Gabinet Zielony" },
  { url: "/b.webp", alt: "Gabinet Różowy, okno", room: "Gabinet Różowy" },
  { url: "/c.webp", alt: "Gabinet Różowy, regał", room: "Gabinet Różowy" },
];

beforeEach(() => {
  Element.prototype.scrollBy = vi.fn();
});

describe("RoomsPeek", () => {
  it("is a section named by its title, linking to the rooms page", () => {
    render(<RoomsPeek header={header} photos={photos} />);
    const section = screen.getByRole("region", { name: "Zajrzyj do środka" });
    expect(
      within(section).getByRole("link", { name: /Zobacz nasze gabinety/ }),
    ).toHaveAttribute("href", "/gabinety");
  });

  it("shows every photo with its description and the room's name", () => {
    render(<RoomsPeek header={header} photos={photos} />);
    const list = screen.getByRole("list", { name: "Zdjęcia gabinetów" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(
      within(items[1]!).getByRole("img", { name: "Gabinet Różowy, okno" }),
    ).toBeInTheDocument();
    expect(within(items[1]!).getByText("Gabinet Różowy")).toBeInTheDocument();
  });

  it("moves along with its buttons and the arrow keys", () => {
    render(<RoomsPeek header={header} photos={photos} />);
    const scroller = screen.getByRole("list", {
      name: "Zdjęcia gabinetów",
    }).parentElement!;
    fireEvent.click(screen.getByRole("button", { name: "Następne zdjęcia" }));
    fireEvent.click(screen.getByRole("button", { name: "Poprzednie zdjęcia" }));
    fireEvent.keyDown(scroller, { key: "ArrowRight" });
    expect(scroller.scrollBy).toHaveBeenCalledTimes(3);
    expect(scroller).toHaveAttribute("tabindex", "0");
  });

  it("shows nothing without photos", () => {
    const { container } = render(<RoomsPeek header={header} photos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
