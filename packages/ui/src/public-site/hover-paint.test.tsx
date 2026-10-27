import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HoverPaint } from "./hover-paint";

describe("the card's painted hover", () => {
  it("paints pink from hovering anywhere on the card, then paints green on leave", () => {
    const { container } = render(
      <article className="ks-wk">
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
  });

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
