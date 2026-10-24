import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttendanceCheckbox } from "./attendance-checkbox";

function deferred() {
  let resolve!: (ok: boolean) => void;
  const promise = new Promise<boolean>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("AttendanceCheckbox", () => {
  it("shows the click at once, before the save answers", async () => {
    const save = deferred();
    const onSave = vi.fn(() => save.promise);
    render(<AttendanceCheckbox attended={false} name="Ola" onSave={onSave} />);
    const box = screen.getByRole("checkbox", { name: "Ola: był(a)" });
    fireEvent.click(box);
    expect(box).toBeChecked();
    expect(onSave).toHaveBeenCalledWith(true);
    await act(async () => save.resolve(true));
    expect(box).toBeChecked();
  });

  it("goes back when the save fails", async () => {
    const save = deferred();
    render(
      <AttendanceCheckbox attended name="Ola" onSave={() => save.promise} />,
    );
    const box = screen.getByRole("checkbox", { name: "Ola: był(a)" });
    fireEvent.click(box);
    expect(box).not.toBeChecked();
    await act(async () => save.resolve(false));
    expect(box).toBeChecked();
  });

  it("follows the saved state when it changes", () => {
    const { rerender } = render(
      <AttendanceCheckbox attended={false} name="Ola" onSave={vi.fn()} />,
    );
    rerender(<AttendanceCheckbox attended name="Ola" onSave={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Ola: był(a)" })).toBeChecked();
  });
});
