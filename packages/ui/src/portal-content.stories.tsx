import { CalendarDays, Clock3, UsersRound } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  SectionHeader,
  StatTile,
  StatusBadge,
} from "./portal-content";

const meta = {
  title: "Portal/Content Primitives",
  parameters: { controls: { disable: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Headers: Story = {
  render: () => (
    <div className="max-w-4xl space-y-10">
      <PageHeader
        actions={<Button>Dodaj specjalistę</Button>}
        description="Zarządzaj zespołem, jego dostępnością i profilem publicznym."
        eyebrow="Zespół i zasoby"
        title="Specjaliści"
      />
      <SectionHeader
        action={<Button variant="ghost">Zobacz wszystkie</Button>}
        description="Najważniejsze dane w czytelnej sekcji."
        title="Dzisiejszy grafik"
      />
    </div>
  ),
};

export const Metrics: Story = {
  render: () => (
    <div className="grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        detail="z 10 w zeszłym tygodniu"
        icon={CalendarDays}
        label="Wizyty w tym tygodniu"
        trend="+20%"
        trendDirection="up"
        value="12"
      />
      <MetricCard
        detail="aktywnych w grafiku"
        icon={UsersRound}
        label="Specjaliści dziś"
        tone="lilac"
        value="6 / 8"
      />
      <MetricCard
        detail="średnio na dziś"
        icon={Clock3}
        label="Wolne godziny"
        tone="peach"
        value="8 h"
      />
    </div>
  ),
};

export const MetricsMobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard
        className="min-h-32 flex-col items-start gap-3"
        icon={CalendarDays}
        label="Wizyty dziś"
        value="4"
      />
      <MetricCard
        className="min-h-32 flex-col items-start gap-3"
        icon={Clock3}
        label="Wolne godziny"
        tone="peach"
        value="8 h"
      />
    </div>
  ),
};

export const Statuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusBadge tone="success">Aktywny</StatusBadge>
      <StatusBadge tone="warning">Oczekuje</StatusBadge>
      <StatusBadge tone="danger">Anulowana</StatusBadge>
      <StatusBadge tone="info">Online</StatusBadge>
      <StatusBadge tone="neutral">Nieaktywny</StatusBadge>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="grid max-w-6xl gap-4 lg:grid-cols-3">
      <EmptyState
        action={<Button>Dodaj pierwszy element</Button>}
        description="Dodane elementy pojawią się w tym miejscu."
        title="Brak danych"
      />
      <LoadingState />
      <ErrorState />
    </div>
  ),
};

export const StatTiles: Story = {
  render: () => (
    <div className="grid max-w-5xl gap-3 sm:grid-cols-3">
      <StatTile
        detail="Rozłożone na 4 zdefiniowane bloki"
        label="Łączny wymiar dyżurów"
        tone="mint"
        value="12 godz. / tydz."
      />
      <StatTile
        detail="Obłożenie dyżurów w bieżącym tygodniu"
        label="Zarezerwowane przez pacjentów"
        value="3,5 godz. (29%)"
      />
      <StatTile
        detail="Dostępne sloty na rejestrację nowych wizyt"
        label="Wolne okna"
        tone="blue"
        value="8,5 godz."
      />
    </div>
  ),
};
