import { loadMyCalendar } from "@/features/calendar/loaders";
import {
  findAvailability,
  formatDate,
  formatWeekday,
  mondayOf,
} from "@repo/scheduling";
import {
  AvailabilityPanel,
  calendarAvailabilityHref,
  calendarNav,
  calendarPanelCloseHref,
  calendarPanelTabs,
  calendarViewTabs,
  calendarVisitHref,
  DaySchedule,
  loadCalendarParams,
  PersonalSummaryPanel,
  ScheduleAgenda,
  ScheduleCanvas,
  ScheduleFrame,
  ScheduleToolbar,
} from "@repo/ui/calendar-view";
import { EmptyState, PageTitle } from "@repo/ui/portal-content";
import { VisitPanel } from "@repo/ui/visit-table";

// Mój kalendarz (stage K5), after the AI Studio reference: the
// specialist's week (or day), their visits over their availability in its
// rooms' colours, the week summed up beside it; a visit's details open
// beside the calendar (?wizyta=…). Changes go through the centre; hours
// and time off are set in /dostepnosc.

const PATH = "/kalendarz";

export default async function CalendarPage({
  searchParams,
}: PageProps<"/kalendarz">) {
  const params = loadCalendarParams(await searchParams);
  const calendar = await loadMyCalendar(params);

  if (!calendar) {
    return (
      <div className="space-y-5">
        <PageTitle>Mój kalendarz</PageTitle>
        <EmptyState
          description="Twoje konto nie jest jeszcze powiązane z profilem specjalisty. Skontaktuj się z administratorem centrum."
          title="Brak profilu specjalisty"
        />
      </div>
    );
  }

  const { today, me, week, day, open } = calendar;
  const context = { today, defaultView: "tydzien" as const };
  const visitHref = (id: string) => calendarVisitHref(PATH, params, id);
  const view = (week ?? day)!;
  const label = week ? "Mój tydzień" : "Mój dzień";
  const availabilityHref = (key: string) =>
    calendarAvailabilityHref(PATH, params, key);
  const shown = findAvailability(view.columns, params.okno);
  const empty = week
    ? "W tym tygodniu nie masz dostępności ani wizyt."
    : "Tego dnia nie masz dostępności ani wizyt.";

  return (
    <div className="space-y-4">
      <PageTitle>Mój kalendarz</PageTitle>
      <ScheduleCanvas className="space-y-4">
        <ScheduleToolbar
          nav={calendarNav(PATH, params, context)}
          switches={
            week
              ? ["puste", "wyszarz", "wizyty", "dostepnosc", "podsumowanie"]
              : ["wyszarz", "wizyty", "dostepnosc"]
          }
          views={calendarViewTabs(PATH, params, context.defaultView)}
        />
        <ScheduleFrame
          aside={
            week && !open && !shown ? (
              <PersonalSummaryPanel
                availabilityHref="/dostepnosc"
                name={me.name}
                subtitle={me.title}
                summary={week.summary}
                visitHref={visitHref}
              />
            ) : null
          }
          desktop={
            <DaySchedule
              availabilityHref={availabilityHref}
              ariaLabel={label}
              empty={empty}
              mode="personal"
              openVisitId={params.wizyta}
              view={view}
              visitHref={visitHref}
            />
          }
          mobile={
            <ScheduleAgenda
              availabilityHref={availabilityHref}
              ariaLabel={label}
              columns={view.columns}
              empty={empty}
              openVisitId={params.wizyta}
              visitHref={visitHref}
            />
          }
          panel={
            open ? (
              <VisitPanel
                closeHref={calendarPanelCloseHref(PATH, params)}
                events={open.events}
                row={open.row}
                tab={params.karta}
                tabs={calendarPanelTabs(PATH, params)}
              />
            ) : shown ? (
              <AvailabilityPanel
                closeHref={calendarPanelCloseHref(PATH, params)}
                column={shown.column}
                dateLabel={`${formatWeekday(shown.column.date)}, ${formatDate(shown.column.date)}`}
                manage={{
                  href: `/dostepnosc?tydzien=${mondayOf(shown.column.date)}`,
                  label: "Zmień dostępność",
                }}
                slot={shown.slot}
                visitHref={visitHref}
              />
            ) : null
          }
        />
      </ScheduleCanvas>
    </div>
  );
}
