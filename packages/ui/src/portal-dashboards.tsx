import type { ReactNode } from "react";
import type { MetricCardProps } from "./portal-content";
import { MetricCard, PageTitle } from "./portal-content";
import {
  AppointmentList,
  AttentionList,
  AvailabilitySummary,
  DashboardEmptyState,
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
  metrics: DashboardMetric[];
  appointments: AppointmentItemData[];
  attention: AttentionItemData[];
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

export interface SpecialistDashboardProps extends DashboardBaseProps {
  availability: AvailabilityDayData[];
  services: SummaryItemData[];
  events: EventItemData[];
}

export function SpecialistDashboard({
  title,
  metrics,
  appointments,
  attention,
  availability,
  services,
  events,
}: SpecialistDashboardProps) {
  return (
    <div className="space-y-5">
      <PageTitle>{title}</PageTitle>
      <DashboardMetrics metrics={metrics} />
      <div className="grid gap-4 xl:grid-cols-12">
        <DashboardSection
          className="xl:col-span-6"
          title="Dzisiejszy grafik"
          actionLabel="Mój kalendarz"
        >
          {appointments.length > 0 ? (
            <AppointmentList items={appointments} />
          ) : (
            <DashboardEmptyState
              title="Brak wizyt na dziś"
              description="Wizyty pojawią się tutaj po uruchomieniu kalendarza."
            />
          )}
        </DashboardSection>
        <DashboardSection className="xl:col-span-3" title="Wymaga uwagi">
          {attention.length > 0 ? (
            <AttentionList items={attention} />
          ) : (
            <DashboardEmptyState
              title="Nic nie wymaga uwagi"
              description="Wszystkie dostępne dane są aktualne."
            />
          )}
        </DashboardSection>
        <DashboardSection
          className="xl:col-span-3"
          title="Dostępność w tym tygodniu"
          actionLabel="Edytuj"
        >
          {availability.length > 0 ? (
            <AvailabilitySummary items={availability} />
          ) : (
            <DashboardEmptyState
              title="Brak danych o dostępności"
              description="Dostępność pojawi się po wdrożeniu grafików."
            />
          )}
        </DashboardSection>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardSection
          title="Moje usługi i stawki"
          actionLabel="Zarządzaj ofertą"
        >
          {services.length > 0 ? (
            <SummaryList ariaLabel="Usługi specjalisty" items={services} />
          ) : (
            <DashboardEmptyState
              title="Brak przypisanych usług"
              description="Usługi przypisane do Twojego profilu pojawią się tutaj."
            />
          )}
        </DashboardSection>
        <DashboardSection title="Najbliższe wydarzenia">
          {events.length > 0 ? (
            <EventList items={events} />
          ) : (
            <DashboardEmptyState
              title="Brak nadchodzących wydarzeń"
              description="Nowe wydarzenia pojawią się w tym miejscu."
            />
          )}
        </DashboardSection>
      </div>
    </div>
  );
}
