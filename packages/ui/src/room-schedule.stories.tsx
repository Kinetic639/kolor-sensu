import type { Meta, StoryObj } from "@storybook/react";
import { CalendarClock, CalendarDays, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { expect } from "storybook/test";
import { CalendarBlock, CalendarWeekGrid } from "./calendar";
import {
  OccupancyRing,
  RoomScheduleBlockBody,
  ScheduleFigure,
} from "./room-schedule";

const meta = {
  title: "Portal/Room schedule",
  parameters: { controls: { disable: true }, layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const range = { start: 8 * 60, end: 20 * 60 };
const days = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];
const time = (minutes: number) => `${String(minutes / 60).padStart(2, "0")}:00`;

function Block({
  start,
  end,
  name,
  initials,
  accent,
  mode = "in_person",
  warning,
}: {
  start: number;
  end: number;
  name: string;
  initials: string;
  accent: number;
  mode?: "in_person" | "online" | "hybrid";
  warning?: string;
}) {
  const timeLabel = `${time(start)} – ${time(end)}`;
  return (
    <CalendarBlock
      accent={`var(--resource-${accent})`}
      end={end}
      label={`${name}, ${timeLabel}`}
      range={range}
      start={start}
      tint={`var(--resource-${accent}-soft)`}
    >
      <RoomScheduleBlockBody
        initials={initials}
        mode={mode}
        name={name}
        timeLabel={timeLabel}
        warning={warning}
      />
    </CalendarBlock>
  );
}

function Closed({
  start,
  end,
  label = "Gabinet zamknięty",
}: {
  start: number;
  end: number;
  label?: string;
}) {
  return (
    <CalendarBlock
      end={end}
      label={label}
      range={range}
      start={start}
      variant="closed"
    >
      {label}
    </CalendarBlock>
  );
}

const content: ReactNode[] = [
  <>
    <Block
      accent={1}
      end={12 * 60}
      initials="AN"
      name="Anna Nowak"
      start={9 * 60}
    />
    <Block
      accent={2}
      end={16 * 60}
      initials="JK"
      mode="hybrid"
      name="Jan Kowalski"
      start={13 * 60}
    />
    <Closed end={20 * 60} start={18 * 60} />
  </>,
  <>
    <Block
      accent={2}
      end={19 * 60}
      initials="JK"
      name="Jan Kowalski"
      start={17 * 60}
      warning="Poza godzinami otwarcia"
    />
    <Closed end={20 * 60} start={18 * 60} />
  </>,
  <Closed end={20 * 60} label="Zamknięte: Remont" start={8 * 60} />,
  <Closed end={20 * 60} start={18 * 60} />,
  <Closed end={20 * 60} start={18 * 60} />,
  <Closed end={20 * 60} start={8 * 60} />,
  <Closed end={20 * 60} start={8 * 60} />,
];

/** The room's week: specialists' hours over its opening hours (Pn–Pt 8–18). */
export const Week: Story = {
  render: () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="overflow-hidden rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)]">
        <CalendarWeekGrid
          columns={days.map((label, index) => ({
            key: String(index),
            label,
            sublabel: `${7 + index} sty`,
            isToday: index === 0,
            ariaLabel: label,
            summary: (
              <span className="text-[0.625rem] text-[var(--text-muted)]">
                {index < 5 && index !== 2 ? "08:00–18:00" : "Zamknięte"}
              </span>
            ),
            content: content[index],
          }))}
          range={range}
        />
      </div>
      <aside
        aria-label="Podsumowanie tygodnia"
        className="grid content-start gap-3"
      >
        <OccupancyRing
          detail="7 z 40 godz. otwarcia"
          label="Obłożenie gabinetu"
          note="1 blok poza godzinami otwarcia"
          percent={18}
        />
        <dl className="grid gap-2">
          <ScheduleFigure
            icon={<CalendarDays aria-hidden="true" className="size-4" />}
            label="Bloki specjalistów"
            value="3"
          />
          <ScheduleFigure
            icon={<CalendarClock aria-hidden="true" className="size-4" />}
            label="Zarezerwowane"
            value="8 godz."
          />
          <ScheduleFigure
            icon={<Clock aria-hidden="true" className="size-4" />}
            label="Pozostało wolnych"
            value="33 godz."
          />
        </dl>
      </aside>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("note", { name: "Jan Kowalski, 17:00 – 19:00" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("Poza godzinami otwarcia"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("progressbar", { name: "Obłożenie gabinetu" }),
    ).toHaveAttribute("aria-valuenow", "18");
  },
};

/** Without opening hours the occupancy cannot be told. */
export const WithoutOpeningHours: Story = {
  render: () => (
    <div className="max-w-xs">
      <OccupancyRing
        detail="Ustaw godziny otwarcia, aby liczyć obłożenie"
        label="Obłożenie gabinetu"
        percent={null}
      />
    </div>
  ),
};

/** More hours taken than the room is open (hours saved before a change). */
export const Overbooked: Story = {
  render: () => (
    <div className="max-w-xs">
      <OccupancyRing
        detail="44 z 40 godz. otwarcia"
        label="Obłożenie gabinetu"
        note="Przeciążenie godzin otwarcia"
        percent={110}
      />
    </div>
  ),
};
