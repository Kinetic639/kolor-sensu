import { KeepFresh } from "@/features/dashboard/keep-fresh";
import { createClient } from "@/lib/supabase/server";
import { unclosedVisitsSummary } from "@repo/supabase/visit-closing";
import { loadAdminDashboard } from "@/features/dashboard/loaders";
import { loadWorkshops } from "@/features/workshops/loaders";
import { workshopTasks } from "@/features/workshops/view-model";
import {
  addDays,
  awaitingPaymentSummary,
  bookingHref,
  dayNav,
  dayTimeline,
  owedInAll,
  settlementView,
  todayCounts,
  weekVisitsByDay,
  weekSummary,
} from "@repo/scheduling";
import {
  DayAgenda,
  DayStrip,
  DayTimelineView,
  TaskList,
  WeekFigures,
  type TaskItem,
} from "@repo/ui/day-dashboard";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { formatInTimeZone } from "date-fns-tz";
import type { ReactNode } from "react";

// The admin's dashboard (R14), as dense as the bookings table, its parts
// in panels on the page's ground (as a roster's rows). The day in figures
// (each a link to its bookings), the day on a line of hours by room or by
// person, its plan as a list beside what needs doing (each leading to
// where it is done: nothing is done from here) and this week against the
// last. Rendered on the server; the live updates refresh it as visits
// change.

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

/** `AK` for Anna Kłobuchowska. */
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** A part of the dashboard, set apart on the page's ground (as a roster's). */
const panel =
  "min-w-0 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)]";

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
    <section className={panel}>
      <div className="flex h-9 items-center gap-2 border-b border-[var(--border)] px-3">
        <h2 className="text-[0.8125rem] font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

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

  // The visits their specialists have not closed yet, per specialist.
  const unclosed = await unclosedVisitsSummary(await createClient()).catch(
    () => [],
  );
  // The workshops: to close, a minimum to decide on, the coming week's.
  const workshops = await loadWorkshops().catch(() => []);
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
  const nav = dayNav(shownDay, today);
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
        icon: "refund" as const,
        href: item.href,
        target: "Rezerwacja",
      };
    }),
    ...reservations.dueSoon.map((visit) => ({
      id: `pay-${visit.id}`,
      title: `Płatność do ${at(visit.paymentDueAt!, "HH:mm")}`,
      detail: `${visit.reference} · ${visit.client.name ?? "Klient"} · ${at(visit.startsAt, "dd.MM, HH:mm")}`,
      tone: "warning" as const,
      icon: "reserved" as const,
      href: bookingHref(visit),
      target: "Rezerwacja",
    })),
    ...pendingDrafts.map((draft) => ({
      id: `draft-${draft.id}`,
      title: "Profil do weryfikacji",
      detail: draft.submittedAt
        ? `${draft.displayName} · wysłany ${at(draft.submittedAt, "dd.MM, HH:mm")}`
        : draft.displayName,
      tone: "info" as const,
      person: {
        id: draft.specialistId,
        name: draft.displayName,
        initials: initialsOf(draft.displayName),
        avatarUrl: avatars[draft.specialistId] ?? null,
        color:
          specialists.find((one) => one.id === draft.specialistId)?.color ??
          null,
      },
      // The profile tab, where the draft is reviewed.
      href: `/specjalisci/${draft.specialistId}?zakladka=profil`,
      target: "Profil",
    })),
    ...unclosed.map((one) => ({
      id: `close-${one.specialistId}`,
      title: `Wizyty do zamknięcia: ${one.visits}`,
      detail: `${one.specialistName} · najstarsza z ${at(one.oldestAt, "dd.MM")}`,
      tone: "warning" as const,
      person: {
        id: one.specialistId,
        name: one.specialistName,
        initials: initialsOf(one.specialistName),
        avatarUrl: avatars[one.specialistId] ?? null,
        color:
          specialists.find((specialist) => specialist.id === one.specialistId)
            ?.color ?? null,
      },
      href: `/rezerwacje?zakres=do-zamkniecia&specjalista=${one.specialistId}`,
      target: "Rezerwacje",
    })),
    ...workshopTasks(workshops, new Date(now), timeZone).map((task) => ({
      ...task,
      icon: task.tone === "warning" ? ("closing" as const) : ("new" as const),
      target: "Warsztat",
    })),
  ];

  return (
    <FullBleed>
      <PageTitle>Dashboard</PageTitle>
      <KeepFresh />
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-[var(--surface-subtle)] p-2 sm:gap-3 sm:p-3 [&>*]:shrink-0">
        <div className={panel}>
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
        </div>
        {/* The day on its line (from a tablet on), its plan as a list
            beside what needs doing, the week under them. */}
        <div className={`${panel} hidden md:block`}>
          <DayTimelineView
            avatars={avatars}
            day={day}
            nav={nav}
            view={os === "specjalisci" ? "specjalisci" : "gabinety"}
          />
        </div>
        <div className="grid items-start gap-2 sm:gap-3 md:grid-cols-2">
          <div className={panel}>
            <DayAgenda avatars={avatars} day={day} nav={nav} />
          </div>
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
        </div>
        <Section
          aside={
            <span className="ml-auto text-[0.72rem] text-[var(--text-muted)] tabular-nums">
              {monday.split("-").reverse().slice(0, 2).join(".")}–
              {addDays(monday, 6).split("-").reverse().slice(0, 2).join(".")}
            </span>
          }
          title="Ten tydzień"
        >
          <WeekFigures
            days={weekVisitsByDay(thisWeek, { timeZone, now, week: monday })}
            figures={week}
          />
        </Section>
      </div>
    </FullBleed>
  );
}
