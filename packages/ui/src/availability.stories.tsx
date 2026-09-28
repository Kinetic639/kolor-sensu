import type { Meta, StoryObj } from "@storybook/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { expect, fn } from "storybook/test";
import {
  AvailabilityWeekPreview,
  TimeOffItem,
  WeeklySchedule,
  type WeeklyScheduleDay,
} from "./availability";
import { Button } from "./button";
import { Card } from "./card";

const meta = {
  title: "Portal/Availability",
  parameters: { controls: { disable: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const WEEKDAYS = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

function windowActions(label: string, onEdit: () => void) {
  return (
    <>
      <Button
        aria-label={`Edytuj ${label}`}
        onClick={onEdit}
        size="icon"
        variant="ghost"
      >
        <Pencil aria-hidden="true" className="size-4" />
      </Button>
      <Button aria-label={`Usuń ${label}`} size="icon" variant="ghost">
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>
    </>
  );
}

function week(onEdit: () => void, onAdd: () => void): WeeklyScheduleDay[] {
  return WEEKDAYS.map((label, index) => ({
    weekday: index + 1,
    label,
    action: (
      <Button
        aria-label={`Dodaj godziny: ${label.toLowerCase()}`}
        onClick={onAdd}
        size="icon"
        variant="ghost"
      >
        <Plus aria-hidden="true" className="size-4" />
      </Button>
    ),
    windows:
      index === 0
        ? [
            {
              id: "mon-1",
              timeLabel: "09:00–13:00",
              placeLabel: "Gabinet 1",
              mode: "hybrid",
              recurrenceLabel: "Co tydzień",
              note: "Pierwszorazowi do 11:00",
              actions: windowActions("poniedziałek 09:00–13:00", onEdit),
            },
            {
              id: "mon-2",
              timeLabel: "15:00–18:00",
              placeLabel: "Online",
              mode: "online",
              recurrenceLabel: "Co tydzień",
              actions: windowActions("poniedziałek 15:00–18:00", onEdit),
            },
          ]
        : index === 3
          ? [
              {
                id: "thu-1",
                timeLabel: "10:00–16:00",
                placeLabel: "Gabinet 2",
                mode: "in_person",
                recurrenceLabel: "Co 2 tygodnie · od 9 stycznia 2030",
                actions: windowActions("czwartek 10:00–16:00", onEdit),
              },
            ]
          : [],
  }));
}

const onEdit = fn();
const onAdd = fn();

export const Weekly: Story = {
  render: () => <WeeklySchedule days={week(onEdit, onAdd)} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Edytuj poniedziałek 09:00–13:00" }),
    );
    await expect(onEdit).toHaveBeenCalled();
    await userEvent.click(
      canvas.getByRole("button", { name: "Dodaj godziny: środa" }),
    );
    await expect(onAdd).toHaveBeenCalled();
    await expect(
      canvas.getByRole("region", { name: "Wtorek" }),
    ).toHaveTextContent("Brak godzin");
  },
};

export const EmptyWeek: Story = {
  render: () => (
    <WeeklySchedule
      days={WEEKDAYS.map((label, index) => ({
        weekday: index + 1,
        label,
        windows: [],
      }))}
    />
  ),
};

export const WeekPreview: Story = {
  render: () => (
    <AvailabilityWeekPreview
      days={[
        {
          date: "2030-01-07",
          label: "pon. 7.01",
          isToday: true,
          windows: [
            {
              id: "a",
              timeLabel: "09:00–13:00",
              placeLabel: "Gabinet 1",
              mode: "hybrid",
            },
            {
              id: "b",
              timeLabel: "15:00–18:00",
              placeLabel: "Online",
              mode: "online",
            },
          ],
          timeOff: [],
        },
        { date: "2030-01-08", label: "wt. 8.01", windows: [], timeOff: [] },
        {
          date: "2030-01-09",
          label: "śr. 9.01",
          windows: [
            {
              id: "c",
              timeLabel: "10:00–12:00",
              placeLabel: "Online",
              mode: "online",
            },
          ],
          timeOff: [],
        },
        {
          date: "2030-01-10",
          label: "czw. 10.01",
          windows: [],
          timeOff: [{ id: "t", label: "Cały dzień", reason: "Szkolenie" }],
        },
        { date: "2030-01-11", label: "pt. 11.01", windows: [], timeOff: [] },
        { date: "2030-01-12", label: "sob. 12.01", windows: [], timeOff: [] },
        { date: "2030-01-13", label: "niedz. 13.01", windows: [], timeOff: [] },
      ]}
      navigation={
        <div className="flex gap-2">
          <Button size="sm" variant="secondary">
            Poprzedni tydzień
          </Button>
          <Button size="sm" variant="secondary">
            Następny tydzień
          </Button>
        </div>
      }
      title="Tydzień 7–13 stycznia 2030"
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("listitem", { name: "pon. 7.01" }),
    ).toHaveAttribute("aria-current", "date");
    await expect(
      canvas.getByRole("listitem", { name: "czw. 10.01" }),
    ).toHaveTextContent("Cały dzień: Szkolenie");
  },
};

export const TimeOff: Story = {
  render: () => (
    <Card className="max-w-xl p-4">
      <ul>
        <TimeOffItem
          actions={
            <Button aria-label="Usuń urlop" size="icon" variant="ghost">
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          }
          label="3–14 lutego 2030"
          reason="Urlop"
        />
        <TimeOffItem label="10 stycznia 2030, 12:00–15:00" />
      </ul>
    </Card>
  ),
};
