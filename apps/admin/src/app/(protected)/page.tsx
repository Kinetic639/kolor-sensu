import { loadAdminDashboard } from "@/features/dashboard/loaders";
import { settleVisitAsCentreAction } from "@/features/visits/actions";
import {
  awaitingPaymentSummary,
  owedInAll,
  roomsToday,
  settlementView,
  teamToday,
  todayCounts,
  todayVisitItems,
} from "@repo/scheduling";
import { AdminDashboard } from "@repo/ui/portal-dashboards";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Hourglass,
  Users,
} from "@repo/ui/portal-icons";
import { SettlementList } from "@repo/ui/settlement-list";

export default async function Home() {
  const {
    timeZone,
    now,
    todayVisits,
    waiting,
    settlements,
    specialists,
    pendingDrafts,
  } = await loadAdminDashboard();

  const counts = todayCounts(todayVisits);
  const reservations = awaitingPaymentSummary(waiting, { timeZone, now });
  const activeSpecialists = specialists.filter((s) => s.active);
  const acceptingSpecialists = activeSpecialists.filter(
    (s) => s.acceptingNewClients,
  );

  const attention = [
    ...(reservations.dueSoon.length
      ? [
          {
            id: "reservations-due-soon",
            title:
              reservations.dueSoon.length === 1
                ? "1 rezerwacja do opłacenia w ciągu doby"
                : `${reservations.dueSoon.length} rezerwacje do opłacenia w ciągu doby`,
            description:
              "Bez płatności zostaną anulowane. Możesz wysłać klientowi link do płatności jeszcze raz.",
            icon: Hourglass,
            tone: "warning" as const,
          },
        ]
      : []),
    ...(pendingDrafts.length
      ? [
          {
            id: "pending-specialist-drafts",
            title: `${pendingDrafts.length} ${pendingDrafts.length === 1 ? "profil oczekuje" : "profile oczekują"} na weryfikację`,
            description:
              "Szkice profili specjalistów wymagają decyzji administratora.",
            icon: AlertTriangle,
            tone: "warning" as const,
          },
        ]
      : []),
  ];

  return (
    <AdminDashboard
      title="Centrum zarządzania ośrodkiem"
      metrics={[
        {
          id: "appointments",
          label: "Dzisiejsze wizyty",
          value: counts.total,
          icon: CalendarDays,
          tone: "blue",
          detail: counts.total
            ? `Opłacone: ${counts.paid} · czeka na płatność: ${counts.awaitingPayment}`
            : "Dziś bez wizyt",
        },
        {
          id: "awaiting-payment",
          label: "Czeka na płatność",
          value: reservations.count,
          icon: Hourglass,
          tone: "peach",
          detail: reservations.nextDue
            ? `Najbliższy termin: ${reservations.nextDue}`
            : "Wszystkie rezerwacje opłacone",
        },
        {
          id: "settlements",
          label: "Do rozliczenia",
          value: settlements.length,
          icon: Banknote,
          tone: settlements.length ? "rose" : "mint",
          detail: settlements.length
            ? `Do zwrotu łącznie: ${owedInAll(settlements)}`
            : "Wszystko rozliczone",
        },
        {
          id: "specialists",
          label: "Aktywni specjaliści",
          value: activeSpecialists.length,
          icon: Users,
          tone: "mint",
          detail: `${acceptingSpecialists.length} przyjmuje nowych klientów`,
        },
      ]}
      appointments={todayVisitItems(todayVisits, { timeZone })}
      attention={attention}
      settlements={
        settlements.length ? (
          <SettlementList
            action={settleVisitAsCentreAction}
            items={settlements.map((s) => settlementView(s, { timeZone }))}
          />
        ) : null
      }
      rooms={roomsToday(todayVisits, { timeZone })}
      team={teamToday(todayVisits, { timeZone })}
      events={[]}
    />
  );
}
