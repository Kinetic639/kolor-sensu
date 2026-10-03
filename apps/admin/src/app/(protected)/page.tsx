import { resendPaymentLinkAction } from "@/features/calendar/actions";
import { loadAdminDashboard } from "@/features/dashboard/loaders";
import { settleVisitAsCentreAction } from "@/features/visits/actions";
import {
  addDays,
  awaitingPaymentSummary,
  dayNav,
  dayTimeline,
  owedInAll,
  settlementView,
  todayCounts,
  weekSummary,
} from "@repo/scheduling";
import {
  DayStrip,
  DayTimelineView,
  TaskList,
  WeekFigures,
  type TaskItem,
} from "@repo/ui/day-dashboard";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { SettleButton } from "@repo/ui/settlement-list";
import { ResendPaymentLinkButton } from "@repo/ui/visit-table";
import { formatInTimeZone } from "date-fns-tz";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

// The admin's dashboard (R14), as the bookings table: edge to edge, no
// cards. The day in figures (each a link to its bookings), the day on a
// line of hours by room or by person, what needs doing (each with its
// action) and this week against the last. Rendered on the server; the live
// updates refresh it as visits change.

/** A real day from the address, `2026-10-09`, or none (today). */
function validDay(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const day = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(day.getTime()) &&
    day.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function visitsWord(count: number) {
  if (count === 1) return "wizyta";
  const last = count % 10;
  const lastTwo = count % 100;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? "wizyty"
    : "wizyt";
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 border-b border-[var(--border)] md:border-b-0 md:first:border-r">
      <div className="flex h-8 items-center gap-2 border-b border-[var(--border)] px-3">
        <h2 className="text-[0.8125rem] font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const chip =
  "inline-flex h-7 items-center rounded-[5px] border border-[var(--border)] px-2 text-[0.75rem] font-medium hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { os, dzien } = await searchParams;
  const {
    timeZone,
    now,
    monday,
    today,
    day: shownDay,
    todayVisits,
    dayVisits,
    thisWeek,
    lastWeek,
    waiting,
    settlements,
    specialists,
    rooms,
    avatars,
    pendingDrafts,
  } = await loadAdminDashboard(validDay(dzien));

  const counts = todayCounts(todayVisits);
  const reservations = awaitingPaymentSummary(waiting, { timeZone, now });
  const day = dayTimeline(dayVisits, {
    timeZone,
    now,
    date: shownDay,
    rooms: rooms
      .filter((room) => room.active)
      .map((room) => ({ id: room.id, name: room.name, color: room.color })),
    specialists: specialists
      .filter((one) => one.active)
      .map((one) => ({
        id: one.id,
        name:
          one.publicDisplayName ?? `${one.firstName} ${one.lastName}`.trim(),
        color: one.color,
      })),
  });
  const week = weekSummary(thisWeek, lastWeek);
  const at = (instant: string, pattern: string) =>
    formatInTimeZone(new Date(instant), timeZone, pattern);

  const tasks: TaskItem[] = [
    ...settlements.map((settlement) => {
      const item = settlementView(settlement, { timeZone });
      return {
        id: `settle-${item.id}`,
        title: `${item.title} · ${item.owed}`,
        detail: item.description,
        tone: "danger" as const,
        href: item.href,
        action: <SettleButton action={settleVisitAsCentreAction} item={item} />,
      };
    }),
    ...reservations.dueSoon.map((visit) => ({
      id: `pay-${visit.id}`,
      title: `Płatność do ${at(visit.paymentDueAt!, "HH:mm")}`,
      detail: `${visit.reference} · ${visit.client.name ?? "Klient"} · ${at(visit.startsAt, "dd.MM, HH:mm")}`,
      tone: "warning" as const,
      href: `/rezerwacje?zakres=wszystkie&q=${visit.reference}&wizyta=${visit.id}`,
      action: (
        <ResendPaymentLinkButton
          action={resendPaymentLinkAction}
          visitId={visit.id}
        />
      ),
    })),
    ...pendingDrafts.map((draft) => ({
      id: `draft-${draft.id}`,
      title: "Profil do weryfikacji",
      detail: draft.submittedAt
        ? `${draft.displayName} · wysłany ${at(draft.submittedAt, "dd.MM")}`
        : draft.displayName,
      tone: "info" as const,
      href: `/specjalisci/${draft.specialistId}`,
      action: (
        <Link
          className={chip}
          href={`/specjalisci/${draft.specialistId}` as Route}
        >
          Sprawdź
        </Link>
      ),
    })),
  ];

  return (
    <FullBleed>
      <PageTitle>Dashboard</PageTitle>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DayStrip
          items={[
            {
              id: "today",
              label: "Dziś",
              value: String(counts.total),
              detail: counts.awaitingPayment
                ? `${visitsWord(counts.total)} · ${counts.awaitingPayment} czeka`
                : visitsWord(counts.total),
              href: "/rezerwacje?zakres=dzis",
            },
            {
              id: "awaiting",
              label: "Czeka na płatność",
              value: String(reservations.count),
              detail: reservations.nextDue
                ? `najbliższa do ${reservations.nextDue}`
                : undefined,
              tone: reservations.count ? "warning" : undefined,
              href: "/rezerwacje?zakres=wszystkie&status=oczekujace",
            },
            {
              id: "owed",
              label: "Do rozliczenia",
              value: settlements.length ? owedInAll(settlements) : "0 zł",
              detail: settlements.length
                ? `${settlements.length} do zwrotu`
                : undefined,
              tone: settlements.length ? "danger" : undefined,
              href: "/rezerwacje?zakres=wszystkie&platnosc=do-zwrotu",
            },
            {
              id: "week",
              label: "Ten tydzień",
              value: week[0]!.value,
              detail: `${visitsWord(Number(week[0]!.value))} · ${week[1]!.value}`,
              href: "/rezerwacje?zakres=ten-tydzien",
            },
          ]}
        />
        <DayTimelineView
          avatars={avatars}
          day={day}
          nav={dayNav(shownDay, today)}
          view={os === "specjalisci" ? "specjalisci" : "gabinety"}
        />
        <div className="grid md:grid-cols-2">
          <Section
            aside={
              tasks.length ? (
                <span className="rounded-[4px] bg-[var(--surface-muted)] px-1.5 text-[0.7rem] text-[var(--text-muted)] tabular-nums">
                  {tasks.length}
                </span>
              ) : null
            }
            title="Do zrobienia"
          >
            <TaskList items={tasks} />
          </Section>
          <Section
            aside={
              <span className="ml-auto text-[0.72rem] text-[var(--text-muted)] tabular-nums">
                {monday.split("-").reverse().slice(0, 2).join(".")}–
                {addDays(monday, 6).split("-").reverse().slice(0, 2).join(".")}
              </span>
            }
            title="Ten tydzień"
          >
            <WeekFigures figures={week} />
          </Section>
        </div>
      </div>
    </FullBleed>
  );
}
