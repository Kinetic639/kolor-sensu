// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DetailsForm } from "./details-form";

vi.mock("./actions", () => ({ saveDetailsAction: vi.fn() }));

afterEach(cleanup);

describe("the booking's details form", () => {
  it("offers the newsletter, unticked, while it is on", () => {
    render(
      <DetailsForm
        newsletterController="Kolor Sensu sp. z o.o."
        payLater={null}
        saved={null}
      />,
    );
    const group = screen.getByRole("group", {
      name: "Newsletter (dobrowolnie)",
    });
    const box = group.querySelector<HTMLInputElement>(
      'input[name="newsletter"]',
    );
    expect(box).not.toBeNull();
    expect(box!.checked).toBe(false);
  });

  it("leaves it out while the newsletter is off", () => {
    render(<DetailsForm payLater={null} saved={null} />);
    expect(
      screen.queryByRole("group", { name: "Newsletter (dobrowolnie)" }),
    ).toBeNull();
  });
});
