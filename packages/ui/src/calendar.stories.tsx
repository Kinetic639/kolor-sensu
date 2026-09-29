import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fireEvent, fn } from "storybook/test";
import { AvailabilityBlockBody, RoomTakenBody } from "./availability";
import {
  CalendarBlock,
  CalendarWeekGrid,
  useDragToCreate,
  type DragSelection,
} from "./calendar";

const meta = {
  title: "Portal/Calendar",
  parameters: { controls: { disable: true }, layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const range = { start: 8 * 60, end: 20 * 60 };

const days = [
  ["Pon", "7 sty"],
  ["Wt", "8 sty"],
  ["Śr", "9 sty"],
  ["Czw", "10 sty"],
  ["Pt", "11 sty"],
  ["Sob", "12 sty"],
  ["Niedz", "13 sty"],
] as const;

function columns(content: Record<number, React.ReactNode> = {}) {
  return days.map(([label, sublabel], index) => ({
    key: `2030-01-${String(7 + index).padStart(2, "0")}`,
    label,
    sublabel,
    isToday: index === 0,
    ariaLabel: `${label} ${sublabel}`,
    content: content[index],
  }));
}

export const Week: Story = {
  render: () => (
    <div className="rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)]">
      <CalendarWeekGrid
        columns={columns({
          0: (
            <>
              <CalendarBlock
                accent="var(--resource-2)"
                end={15 * 60}
                label="Dostępność 09:00–15:00, Gabinet 2"
                onClick={() => {}}
                range={range}
                start={9 * 60}
                tint="var(--resource-2-soft)"
              >
                <AvailabilityBlockBody
                  hint="Kliknij, aby edytować"
                  mode="in_person"
                  placeLabel="Gabinet 2"
                  timeLabel="09:00 – 15:00"
                />
              </CalendarBlock>
              <CalendarBlock
                accent="var(--info)"
                end={18 * 60}
                label="Dostępność 16:00–18:00, online"
                onClick={() => {}}
                range={range}
                start={16 * 60}
                tint="var(--info-soft)"
              >
                <AvailabilityBlockBody
                  mode="online"
                  placeLabel="Online"
                  timeLabel="16:00 – 18:00"
                />
              </CalendarBlock>
            </>
          ),
          2: (
            <CalendarBlock
              end={13 * 60}
              label="Nieobecność 10:00–13:00, szkolenie"
              range={range}
              start={10 * 60}
              variant="blocked"
            >
              <span className="font-semibold text-[var(--text-muted)]">
                Nieobecność: szkolenie
              </span>
            </CalendarBlock>
          ),
          3: (
            <CalendarBlock
              accent="var(--resource-1)"
              end={11 * 60 + 30}
              label="Wizyta 10:00–11:30"
              range={range}
              start={10 * 60}
              variant="appointment"
            >
              <p className="font-bold">10:00–11:30</p>
              <p className="truncate">Wizyta</p>
            </CalendarBlock>
          ),
        })}
        range={range}
      />
    </div>
  ),
};

const onCreate = fn();

function DragDemo() {
  const [created, setCreated] = useState<DragSelection | null>(null);
  const drag = useDragToCreate({
    range,
    onCreate: (selection) => {
      onCreate(selection);
      setCreated(selection);
    },
  });
  return (
    <div className="grid gap-3">
      <p className="text-sm" role="status">
        {created
          ? `Zaznaczono ${created.columnKey}: ${created.start / 60}:00–${created.end / 60}:00`
          : "Przeciągnij w dół w kolumnie dnia."}
      </p>
      <div className="rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)]">
        <CalendarWeekGrid
          columns={columns().map((column) => ({
            ...column,
            props: drag.columnProps(column.key),
            content:
              drag.preview?.columnKey === column.key ? (
                <CalendarBlock
                  end={drag.preview.end}
                  label="Nowa dostępność"
                  range={range}
                  start={drag.preview.start}
                  variant="preview"
                >
                  Puść, aby zapisać
                </CalendarBlock>
              ) : null,
          }))}
          range={range}
        />
      </div>
    </div>
  );
}

export const DragToCreate: Story = {
  render: () => <DragDemo />,
  play: async ({ canvas }) => {
    const column = canvas.getByRole("group", { name: "Wt 8 sty" });
    const rect = column.getBoundingClientRect();
    // 9:00 to 11:00 in an 8:00–20:00 column.
    const y = (minutes: number) =>
      rect.top +
      ((minutes - range.start) / (range.end - range.start)) * rect.height;
    await fireEvent.pointerDown(column, {
      button: 0,
      clientY: y(9 * 60),
      pointerId: 1,
    });
    await fireEvent.pointerMove(column, { clientY: y(11 * 60), pointerId: 1 });
    await fireEvent.pointerUp(column, { clientY: y(11 * 60), pointerId: 1 });
    await expect(onCreate).toHaveBeenCalledWith({
      columnKey: "2030-01-08",
      start: 9 * 60,
      end: 11 * 60,
    });
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Zaznaczono 2030-01-08: 9:00–11:00",
    );
  },
};

/**
 * A room over one's own week: a colleague's hours in it (taken) and the
 * hours it is closed, behind one's own blocks.
 */
export const RoomOccupancy: Story = {
  render: () => (
    <div className="rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)]">
      <CalendarWeekGrid
        columns={columns({
          0: (
            <>
              <CalendarBlock
                accent="var(--resource-1)"
                end={12 * 60}
                label="Gabinet 1 zajęty: Anna Nowak, 10:00 – 12:00"
                range={range}
                start={10 * 60}
                variant="taken"
              >
                <RoomTakenBody
                  initials="AN"
                  name="Anna Nowak"
                  timeLabel="10:00 – 12:00"
                />
              </CalendarBlock>
              <CalendarBlock
                accent="var(--resource-1)"
                end={16 * 60}
                label="Dostępność 13:00–16:00, Gabinet 1"
                range={range}
                start={13 * 60}
                tint="var(--resource-1-soft)"
              >
                <AvailabilityBlockBody
                  mode="in_person"
                  placeLabel="Gabinet 1"
                  timeLabel="13:00 – 16:00"
                />
              </CalendarBlock>
              <CalendarBlock
                end={20 * 60}
                label="Gabinet 1 zamknięty, 18:00–20:00"
                range={range}
                start={18 * 60}
                variant="closed"
              >
                Gabinet 1 zamknięty
              </CalendarBlock>
            </>
          ),
          5: (
            <CalendarBlock
              end={20 * 60}
              label="Gabinet 1 zamknięty, 08:00–20:00"
              range={range}
              start={8 * 60}
              variant="closed"
            >
              Gabinet 1 zamknięty
            </CalendarBlock>
          ),
        })}
        range={range}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("note", {
        name: "Gabinet 1 zajęty: Anna Nowak, 10:00 – 12:00",
      }),
    ).toBeInTheDocument();
  },
};
