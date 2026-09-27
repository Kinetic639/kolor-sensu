import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sampleRooms, sampleWorkshops } from "./feature-samples";
import { FeatureSection } from "./feature-section";

function picture(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".ks-wc")!;
}

describe("FeatureSection", () => {
  it("introduces the topic and links to more", () => {
    render(<FeatureSection {...sampleRooms} />);
    expect(screen.getByText("Nasze gabinety")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Przestrzeń, która wspiera",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Jasne, przytulne gabinety/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Zobacz nasze gabinety" }),
    ).toHaveAttribute("href", "#gabinety");
  });

  it("shows the painted picture with its alt text", () => {
    render(<FeatureSection {...sampleRooms} />);
    expect(
      screen.getByRole("img", { name: sampleRooms.image.alt }),
    ).toBeInTheDocument();
  });

  it("puts the picture on the left or the right on wide screens", () => {
    const { container, rerender } = render(<FeatureSection {...sampleRooms} />);
    const section = () => container.querySelector("section")!;
    expect(section()).toHaveAttribute("data-image-position", "left");
    expect(picture(container)).toHaveClass("lg:order-first");

    rerender(<FeatureSection {...sampleWorkshops} />);
    expect(section()).toHaveAttribute("data-image-position", "right");
    expect(picture(container)).not.toHaveClass("lg:order-first");
  });

  it("keeps the intro first in the markup either way", () => {
    for (const sample of [sampleRooms, sampleWorkshops]) {
      const { container, unmount } = render(<FeatureSection {...sample} />);
      const section = container.querySelector("section")!;
      expect(section.firstElementChild).toContainElement(
        screen.getByRole("heading", { level: 2 }),
      );
      expect(section.lastElementChild).toBe(picture(container));
      unmount();
    }
  });

  it("is static by default and paints the picture in when animated", () => {
    const { container } = render(<FeatureSection {...sampleRooms} />);
    expect(container.querySelector("[data-animation]")).toBeNull();
    const html = renderToString(
      <FeatureSection {...sampleRooms} animationPreset="watercolor-reveal" />,
    );
    expect(html).toContain('data-animation="watercolor-reveal"');
  });
});
