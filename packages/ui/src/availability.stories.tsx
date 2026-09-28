import type { Meta, StoryObj } from "@storybook/react";
import { Copy, Pencil, RotateCw, Trash2 } from "lucide-react";
import { expect, fn } from "storybook/test";
import { AvailabilityRuleCard, StatDots, TimeOffItem } from "./availability";
import { Button } from "./button";
import { Card } from "./card";

const meta = {
  title: "Portal/Availability",
  parameters: { controls: { disable: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const onEdit = fn();

function ruleActions(label: string) {
  return (
    <>
      <Button size="sm" variant="secondary">
        <RotateCw aria-hidden="true" className="size-3.5" />
        Na cały tydzień
      </Button>
      <Button
        aria-label={`Skopiuj na kolejny dzień: ${label}`}
        size="icon"
        variant="secondary"
      >
        <Copy aria-hidden="true" className="size-4" />
      </Button>
      <Button onClick={onEdit} size="sm" variant="secondary">
        <Pencil aria-hidden="true" className="size-3.5" />
        Edytuj regułę
      </Button>
      <Button aria-label={`Usuń regułę: ${label}`} size="icon" variant="ghost">
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>
    </>
  );
}

export const RuleCards: Story = {
  render: () => (
    <div className="grid max-w-6xl gap-3">
      <AvailabilityRuleCard
        accent="var(--resource-2)"
        actions={ruleActions("poniedziałek 09:00–15:00")}
        durationLabel="6 godz."
        mode="in_person"
        note="Pierwszorazowi do 11:00"
        occupancy={{
          percent: 58,
          bookedLabel: "3,5 godz. zajęte (3 wizyty)",
          freeLabel: "2,5 godz. wolne",
        }}
        placeLabel="Gabinet 2"
        recurrenceLabel="Co tydzień"
        subtitle="od 7 stycznia 2030"
        timeLabel="09:00 – 15:00"
        title="Poniedziałek"
      />
      <AvailabilityRuleCard
        accent="var(--info)"
        actions={ruleActions("czwartek 16:00–19:00")}
        durationLabel="3 godz."
        mode="online"
        occupancy={{
          percent: 0,
          bookedLabel: "0 godz. zajęte (0 wizyt)",
          freeLabel: "3 godz. wolne",
        }}
        placeLabel="Online"
        recurrenceLabel="Co 2 tygodnie"
        subtitle="od 9 stycznia 2030"
        timeLabel="16:00 – 19:00"
        title="Czwartek"
      />
      <AvailabilityRuleCard
        accent="var(--resource-1)"
        durationLabel="2 godz."
        mode="hybrid"
        placeLabel="Gabinet 1"
        recurrenceLabel="Jednorazowo"
        subtitle="piątek, 11 stycznia 2030"
        timeLabel="10:00 – 12:00"
        title="11 stycznia 2030"
      />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Edytuj regułę" })[0]!,
    );
    await expect(onEdit).toHaveBeenCalled();
    await expect(
      canvas.getAllByRole("progressbar", { name: "Rezerwacje w tym bloku" })[0],
    ).toHaveAttribute("aria-valuenow", "58");
  },
};

export const Stats: Story = {
  render: () => (
    <StatDots
      items={[
        { label: "Łączna dostępność", value: "6 godz.", tone: "primary" },
        { label: "Zarezerwowane wizyty", value: "3,5 godz.", tone: "info" },
        {
          label: "Wolny czas dla pacjentów",
          value: "2,5 godz.",
          tone: "warning",
        },
      ]}
    />
  ),
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
