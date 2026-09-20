import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestContentBlock } from "./test-content-block";

describe("TestContentBlock", () => {
  it("renders heading and body", () => {
    render(<TestContentBlock body="Treść testowa." heading="Kolor Sensu" />);

    expect(screen.getByText("Kolor Sensu")).toBeInTheDocument();
    expect(screen.getByText("Treść testowa.")).toBeInTheDocument();
  });

  it("renders the button only when a label is provided", () => {
    const { rerender } = render(
      <TestContentBlock body="Treść." buttonLabel={null} heading="H" />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(
      <TestContentBlock body="Treść." buttonLabel="Kliknij" heading="H" />,
    );
    expect(screen.getByRole("button", { name: "Kliknij" })).toBeInTheDocument();
  });
});
