import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarBlock, CalendarWeekGrid, useDragToCreate } from "./calendar";

const range = { start: 8 * 60, end: 20 * 60 };

const columns = [
  { key: "2030-01-07", label: "Pon", sublabel: "7 sty", isToday: true },
  { key: "2030-01-08", label: "Wt", sublabel: "8 sty" },
];

describe("CalendarWeekGrid", () => {
  it("labels the hours and every day column", () => {
    render(
      <CalendarWeekGrid
        columns={columns.map((column) => ({
          ...column,
          ariaLabel: `${column.label} ${column.sublabel}`,
        }))}
        range={range}
      />,
    );
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("19:00")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Pon 7 sty" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pon").closest("[aria-current]")).toHaveAttribute(
      "aria-current",
      "date",
    );
  });
});

describe("CalendarBlock", () => {
  it("shows someone else's hours behind one's own, not in the way", () => {
    render(
      <CalendarBlock
        accent="var(--resource-1)"
        end={12 * 60}
        label="Gabinet 1 zajęty: Anna Nowak, 10:00 – 12:00"
        range={range}
        start={10 * 60}
        variant="taken"
      >
        Anna Nowak
      </CalendarBlock>,
    );
    const block = screen.getByRole("note", {
      name: "Gabinet 1 zajęty: Anna Nowak, 10:00 – 12:00",
    });
    expect(block.className).toContain("z-0");
    expect(block.className).toContain("pointer-events-none");
  });

  it("shades closed hours behind the other blocks", () => {
    render(
      <CalendarBlock
        end={20 * 60}
        label="Gabinet zamknięty, 18:00–20:00"
        range={range}
        start={18 * 60}
        variant="closed"
      >
        Gabinet zamknięty
      </CalendarBlock>,
    );
    const block = screen.getByRole("note", {
      name: "Gabinet zamknięty, 18:00–20:00",
    });
    expect(block.className).toContain("z-0");
    expect(block.className).not.toContain("z-10");
    expect(block.style.top).toBe("83.33333333333334%");
  });

  it("is placed by its minutes within the visible range", () => {
    render(
      <CalendarBlock
        end={11 * 60}
        label="Dostępność 09:00–11:00"
        range={range}
        start={9 * 60}
      >
        09:00–11:00
      </CalendarBlock>,
    );
    const block = screen.getByLabelText("Dostępność 09:00–11:00");
    expect(block.style.top).toBe(`${(60 / 720) * 100}%`);
    expect(block.style.height).toBe(`${(120 / 720) * 100}%`);
  });

  it("becomes a button when it can be opened", () => {
    const onOpen = vi.fn();
    render(
      <CalendarBlock
        end={600}
        label="Edytuj"
        onClick={onOpen}
        range={range}
        start={540}
      >
        x
      </CalendarBlock>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    expect(onOpen).toHaveBeenCalled();
  });
});

function DragHarness({
  onCreate,
  blocked,
}: {
  onCreate: (value: unknown) => void;
  blocked?: (columnKey: string) => { start: number; end: number }[];
}) {
  const drag = useDragToCreate({ range, onCreate, blocked });
  return (
    <CalendarWeekGrid
      columns={columns.map((column) => ({
        ...column,
        ariaLabel: column.label,
        props: drag.columnProps(column.key),
        content:
          drag.preview?.columnKey === column.key ? (
            <CalendarBlock
              end={drag.preview.end}
              label="Podgląd"
              range={range}
              start={drag.preview.start}
              variant="preview"
            >
              podgląd
            </CalendarBlock>
          ) : null,
      }))}
      range={range}
    />
  );
}

describe("useDragToCreate", () => {
  it("turns a drag down a day column into a snapped time range", () => {
    const onCreate = vi.fn();
    render(<DragHarness onCreate={onCreate} />);
    const column = screen.getByRole("group", { name: "Wt" });
    // 720 px column: one pixel per minute of the 8:00–20:00 range.
    column.getBoundingClientRect = () =>
      ({ top: 0, height: 720, left: 0, width: 100 }) as DOMRect;

    fireEvent.pointerDown(column, { button: 0, clientY: 60, pointerId: 1 });
    fireEvent.pointerMove(column, { clientY: 183, pointerId: 1 });
    expect(within(column).getByLabelText("Podgląd")).toBeInTheDocument();
    fireEvent.pointerUp(column, { clientY: 183, pointerId: 1 });

    expect(onCreate).toHaveBeenCalledWith({
      columnKey: "2030-01-08",
      start: 9 * 60,
      end: 11 * 60,
    });
    expect(screen.queryByLabelText("Podgląd")).not.toBeInTheDocument();
  });

  describe("around blocked times", () => {
    // Tuesday 10:00–12:00 is someone else's (1 px per minute from 8:00).
    const blocked = (key: string) =>
      key === "2030-01-08" ? [{ start: 600, end: 720 }] : [];

    function tuesday(onCreate = vi.fn()) {
      render(<DragHarness blocked={blocked} onCreate={onCreate} />);
      const column = screen.getByRole("group", { name: "Wt" });
      column.getBoundingClientRect = () =>
        ({ top: 0, height: 720, left: 0, width: 100 }) as DOMRect;
      return { column, onCreate };
    }

    it("stops a drag where the blocked time begins", () => {
      const { column, onCreate } = tuesday();
      // 9:00 down to 13:00.
      fireEvent.pointerDown(column, { button: 0, clientY: 60, pointerId: 1 });
      fireEvent.pointerMove(column, { clientY: 300, pointerId: 1 });
      fireEvent.pointerUp(column, { clientY: 300, pointerId: 1 });
      expect(onCreate).toHaveBeenCalledWith({
        columnKey: "2030-01-08",
        start: 9 * 60,
        end: 10 * 60,
      });
    });

    it("does nothing when the press is on the blocked time", () => {
      const { column, onCreate } = tuesday();
      // 11:00 down to 13:00.
      fireEvent.pointerDown(column, { button: 0, clientY: 180, pointerId: 1 });
      fireEvent.pointerMove(column, { clientY: 300, pointerId: 1 });
      expect(screen.queryByLabelText("Podgląd")).not.toBeInTheDocument();
      fireEvent.pointerUp(column, { clientY: 300, pointerId: 1 });
      expect(onCreate).not.toHaveBeenCalled();
    });
  });

  it("keeps the day columns' dividers when it adds its handlers", () => {
    render(<DragHarness onCreate={vi.fn()} />);
    const column = screen.getByRole("group", { name: "Wt" });
    expect(column).toHaveClass("border-r", "cursor-crosshair");
  });

  it("stops the browser from selecting text while dragging", () => {
    render(<DragHarness onCreate={vi.fn()} />);
    const column = screen.getByRole("group", { name: "Wt" });
    column.getBoundingClientRect = () =>
      ({ top: 0, height: 720, left: 0, width: 100 }) as DOMRect;
    const allowed = fireEvent.pointerDown(column, {
      button: 0,
      clientY: 60,
      pointerId: 1,
    });
    expect(allowed).toBe(false);
  });

  it("ignores presses on existing blocks and other buttons", () => {
    const onCreate = vi.fn();
    render(<DragHarness onCreate={onCreate} />);
    const column = screen.getByRole("group", { name: "Pon" });
    const inner = document.createElement("div");
    inner.setAttribute("data-calendar-item", "");
    column.appendChild(inner);

    fireEvent.pointerDown(inner, { button: 0, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(column, { clientY: 120, pointerId: 1 });
    expect(onCreate).not.toHaveBeenCalled();
  });
});
