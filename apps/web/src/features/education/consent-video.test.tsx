// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { COOKIE_CONSENT_EVENT } from "@repo/ui/public-site/cookie-consent";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { ConsentVideo } from "./consent-video";

const video = {
  provider: "YouTube" as const,
  embedUrl: "https://www.youtube-nocookie.com/embed/abc123?autoplay=1&rel=0",
};

describe("an e-book's film", () => {
  it("loads nothing from the provider until the visitor clicks", () => {
    const { container } = render(
      <ConsentVideo posterUrl={null} title="Spokojny sen" video={video} />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByText(/wczytuje się po kliknięciu/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Odtwórz film" }));
    expect(screen.getByTitle("Film: Spokojny sen")).toHaveAttribute(
      "src",
      video.embedUrl,
    );
  });

  it("goes when consent is withdrawn", () => {
    const { container } = render(
      <ConsentVideo posterUrl={null} title="Sen" video={video} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Odtwórz film" }));
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COOKIE_CONSENT_EVENT, { detail: "necessary" }),
      );
    });
    expect(container.querySelector("iframe")).toBeNull();
  });
});
