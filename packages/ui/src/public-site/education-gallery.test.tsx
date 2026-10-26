import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EducationArticleGallery } from "./education-gallery";
const slides = [1, 2, 3].map((i) => (
  <a href={`#article-${i}`} key={i}>
    Artykuł {i}
  </a>
));
afterEach(() => vi.restoreAllMocks());
describe("the education article gallery", () => {
  it("lets visitors swipe and follow every link without JavaScript", () => {
    expect(
      renderToString(<EducationArticleGallery slides={slides} />),
    ).not.toContain("inert=");
  });
  it("has no redundant controls for a single article", () => {
    render(<EducationArticleGallery slides={slides.slice(0, 1)} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Artykuł 1" })).toBeInTheDocument();
  });
  it("updates the current slide after a swipe and prevents focus on hidden links", () => {
    const { container } = render(<EducationArticleGallery slides={slides} />);
    const track = container.querySelector<HTMLElement>(
      ".ks-education-gallery-track",
    )!;
    Object.defineProperty(track, "clientWidth", { value: 500 });
    track.scrollLeft = 500;
    fireEvent.scroll(track);
    expect(screen.getByRole("button", { name: "Artykuł 2" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    const cards = [
      ...container.querySelectorAll<HTMLElement>(
        '[aria-roledescription="slajd"]',
      ),
    ];
    expect(cards.map((c) => c.hasAttribute("inert"))).toEqual([
      true,
      false,
      true,
    ]);
    track.scrollLeft = 1000;
    fireEvent.scroll(track);
    expect(
      screen.getByRole("button", { name: "Następny slajd" }),
    ).toBeDisabled();
  });
});
