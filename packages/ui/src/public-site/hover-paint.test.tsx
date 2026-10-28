import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HoverPaint } from "./hover-paint";

describe("the card's painted hover", () => {
  it("repaints the shared shelf from either book, but not its empty space", () => {
    const { container } = render(
      <div className="ks-education-books">
        <HoverPaint />
        <article className="ks-education-book">First</article>
        <article className="ks-education-book">Second</article>
      </div>,
    );
    const shelf = container.firstElementChild!;
    const paint = shelf.querySelector(".ks-wk__hover-paint")!;
    fireEvent.mouseEnter(shelf);
    expect(paint).not.toHaveAttribute("data-active");
    for (const book of shelf.querySelectorAll("article")) {
      fireEvent.mouseEnter(book);
      expect(paint).toHaveAttribute("data-tone", "pink");
      fireEvent.mouseLeave(book);
      expect(paint).toHaveAttribute("data-tone", "green");
    }
  });
  it.each(["ks-wk", "ks-education-article"])(
    "paints pink from hovering anywhere on %s, then paints green on leave",
    (className) => {
      const { container } = render(
        <article className={className}>
          <HoverPaint />
          <p>Card content</p>
        </article>,
      );
      const card = container.querySelector("article")!;
      const paint = container.querySelector(".ks-wk__hover-paint")!;
      expect(paint).not.toHaveAttribute("data-active");
      fireEvent.mouseEnter(card);
      expect(paint).toHaveAttribute("data-tone", "pink");
      fireEvent.mouseLeave(card);
      expect(paint).toHaveAttribute("data-tone", "green");
      fireEvent.mouseEnter(card);
      expect(paint).toHaveAttribute("data-tone", "pink");
    },
  );

  it("keeps the hover paint while a keyboard user is still inside the card", () => {
    const { container } = render(
      <article className="ks-wk">
        <HoverPaint />
        <a href="#details">Details</a>
      </article>,
    );
    const card = container.querySelector("article")!;
    const link = container.querySelector("a")!;
    const paint = container.querySelector(".ks-wk__hover-paint")!;
    fireEvent.focusIn(link);
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);
    expect(paint).toHaveAttribute("data-tone", "pink");
    fireEvent.focusOut(link, { relatedTarget: document.body });
    expect(paint).toHaveAttribute("data-tone", "green");
  });
});
