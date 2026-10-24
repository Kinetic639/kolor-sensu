// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";

// Something on the page breaks: the visitor sees the centre's page, can try
// again or go home, and the error is logged.

describe("a page that breaks", () => {
  it("says so, tries again on a click and leads home", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = new Error("boom");
    render(<ErrorPage error={error} retry={retry} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Coś poszło nie tak",
    );
    expect(screen.getByRole("link", { name: "Strona główna" })).toHaveAttribute(
      "href",
      "/",
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(error);
    log.mockRestore();
  });
});
