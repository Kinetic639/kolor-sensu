import type { MetricCardProps } from "./portal-content";
import { MetricCard, PageHeader } from "./portal-content";
import {
  AppointmentList,
  AttentionList,
  AvailabilitySummary,
  DashboardSection,
  EventList,
  SummaryList,
  type AppointmentItemData,
  type AttentionItemData,
  type AvailabilityDayData,
  type EventItemData,
  type SummaryItemData,
} from "./portal-dashboard";

type DashboardMetric = MetricCardProps & { id: string };

interface DashboardBaseProps {
  title: string;
  description: string;
  dateLabel?: string;
  metrics: DashboardMetric[];
  appointments: AppointmentItemData[];
  attention: AttentionItemData[];
}

export interface AdminDashboardProps extends DashboardBaseProps {
  rooms: SummaryItemData[];
  team: SummaryItemData[];
  events: EventItemData[];
}

function DashboardMetrics({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map(({ id, ...metric }) => (
        <MetricCard
          className="min-h-24 p-3 sm:min-h-28 sm:p-4"
          key={id}
          {...metric}
        />
      ))}
    </div>
  );
}

export function AdminDashboard({
  title,
  description,
  dateLabel,
  metrics,
  appointments,
  attention,
  rooms,
  team,
  events,
}: AdminDashboardProps) {
  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        meta={
          dateLabel ? (
            <span className="text-sm font-semibold text-[var(--text-muted)]">
              {dateLabel}
            </span>
          ) : null
        }
      />
      <DashboardMetrics metrics={metrics} />
      <div className="grid gap-4 xl:grid-cols-12">
        <DashboardSection
          className="order-2 xl:order-1 xl:col-span-6"
          title="Dzisiejsze wizyty"
          actionLabel="Pełny kalendarz"
        >
          <AppointmentList items={appointments} />
        </DashboardSection>
        <DashboardSection
          className="order-1 xl:order-2 xl:col-span-3"
          title="Wymaga uwagi"
        >
          <AttentionList items={attention} />
        </DashboardSection>
        <DashboardSection
          className="order-3 xl:col-span-3"
          title="Gabinety dzisiaj"
          actionLabel="Zobacz gabinety"
        >
          <SummaryList ariaLabel="Status gabinetów" items={rooms} />
        </DashboardSection>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardSection
          title="Nasz zespół dziś"
          actionLabel="Zobacz specjalistów"
        >
          <SummaryList ariaLabel="Dostępność zespołu" items={team} />
        </DashboardSection>
        <DashboardSection title="Nadchodzące warsztaty i wydarzenia">
          <EventList items={events} />
        </DashboardSection>
      </div>
    </div>
  );
}

export interface SpecialistDashboardProps extends DashboardBaseProps {
  availability: AvailabilityDayData[];
  services: SummaryItemData[];
  events: EventItemData[];
}

export function SpecialistDashboard({
  title,
  description,
  dateLabel,
  metrics,
  appointments,
  attention,
  availability,
  services,
  events,
}: SpecialistDashboardProps) {
  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        meta={
          dateLabel ? (
            <span className="text-sm font-semibold text-[var(--text-muted)]">
              {dateLabel}
            </span>
          ) : null
        }
      />
      <DashboardMetrics metrics={metrics} />
      <div className="grid gap-4 xl:grid-cols-12">
        <DashboardSection
          className="xl:col-span-6"
          title="Dzisiejszy grafik"
          actionLabel="Mój kalendarz"
        >
          <AppointmentList items={appointments} />
        </DashboardSection>
        <DashboardSection className="xl:col-span-3" title="Wymaga uwagi">
          <AttentionList items={attention} />
        </DashboardSection>
        <DashboardSection
          className="xl:col-span-3"
          title="Dostępność w tym tygodniu"
          actionLabel="Edytuj"
        >
          <AvailabilitySummary items={availability} />
        </DashboardSection>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardSection
          title="Moje usługi i stawki"
          actionLabel="Zarządzaj ofertą"
        >
          <SummaryList ariaLabel="Usługi specjalisty" items={services} />
        </DashboardSection>
        <DashboardSection title="Najbliższe wydarzenia">
          <EventList items={events} />
        </DashboardSection>
      </div>
    </div>
  );
}
