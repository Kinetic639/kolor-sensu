import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, useSidebar } from "./sidebar";

function SidebarState() {
  const { state } = useSidebar();
  return <p>{state}</p>;
}

describe("SidebarProvider keyboard shortcut", () => {
  const onError = vi.fn((event: ErrorEvent) => event.preventDefault());

  afterEach(() => {
    window.removeEventListener("error", onError);
    onError.mockClear();
  });

  it("toggles the sidebar with Ctrl+B", () => {
    render(
      <SidebarProvider defaultOpen>
        <SidebarState />
      </SidebarProvider>,
    );

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });

    expect(screen.getByText("collapsed")).toBeInTheDocument();
  });

  // Chrome fires keydown without `key` when it autofills a form field.
  it("ignores key events that carry no key", () => {
    window.addEventListener("error", onError);
    render(
      <SidebarProvider defaultOpen>
        <SidebarState />
      </SidebarProvider>,
    );

    window.dispatchEvent(new Event("keydown"));

    expect(onError).not.toHaveBeenCalled();
    expect(screen.getByText("expanded")).toBeInTheDocument();
  });
});
