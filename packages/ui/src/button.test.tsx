import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders and handles user interaction", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Zapisz</Button>);
    await user.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
