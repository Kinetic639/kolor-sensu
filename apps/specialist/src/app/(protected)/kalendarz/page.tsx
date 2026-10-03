import {
  bookVisitAction,
  resendPaymentLinkAction,
} from "@/features/calendar/actions";
import { loadMyCalendar } from "@/features/calendar/loaders";
import {
  findAvailability,
  formatDate,
  formatWeekday,
  mondayOf,
  newVisitDefaults,
} from "@repo/scheduling";
import {
  AddVisitBanner,
  AddVisitButton,
  AvailabilityPanel,
  calendarAddHref,
  calendarAvailabilityHref,
  calendarNav,
  calendarPanelCloseHref,
  calendarPanelTabs,
  calendarPickHref,
  calendarViewTabs,
  calendarVisitHref,
  DaySchedule,
  loadCalendarParams,
  NewVisitPanel,
  PersonalSummaryPanel,
  ScheduleAgenda,
  ScheduleCanvas,
  ScheduleFrame,
  ScheduleToolbar,
} from "@repo/ui/calendar-view";
import { FullBleed } from "@repo/ui/full-bleed";
import { EmptyState, PageTitle } from "@repo/ui/portal-content";
import { ResendPaymentLinkButton, VisitPanel } from "@repo/ui/visit-table";

// Mój kalendarz (stage K5), after the AI Studio reference: the
// specialist's week (or day), their visits over their availability in its
// rooms' colours, the week summed up beside it; a visit's details open
// beside the calendar (?wizyta=…); "+ Nowa wizyta" books a client in (pick
// a place in the grid, the form opens). Other changes go through the
// centre; hours and time off are set in /dostepnosc.

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

  const { today, period, me, week, day, open, booking } = calendar;
  const context = { today, defaultView: "tydzien" as const };
  const visitHref = (id: string) => calendarVisitHref(PATH, params, id);
  const view = (week ?? day)!;
  const label = week ? "Mój tydzień" : "Mój dzień";
  // Adding: the grid picks a time until the form is open.
  const picking = params.nowa && !params.termin;
  const availabilityHref = picking
    ? undefined
    : (key: string) => calendarAvailabilityHref(PATH, params, key);
  const shown = findAvailability(view.columns, params.okno);
  const empty = week
    ? "W tym tygodniu nie masz dostępności ani wizyt."
    : "Tego dnia nie masz dostępności ani wizyt.";

  return (
    <FullBleed>
      <PageTitle>Mój kalendarz</PageTitle>
      <ScheduleCanvas className="flex min-h-0 flex-1 flex-col">
        <ScheduleToolbar
          nav={calendarNav(PATH, params, context)}
          switches={
            week
              ? ["puste", "wyszarz", "wizyty", "dostepnosc", "podsumowanie"]
              : ["wyszarz", "wizyty", "dostepnosc"]
          }
          actions={
            <AddVisitButton
              active={params.nowa}
              href={calendarAddHref(PATH, params, !params.nowa)}
            />
          }
          views={calendarViewTabs(PATH, params, context.defaultView)}
        />
        {picking ? (
          <AddVisitBanner
            cancelHref={calendarAddHref(PATH, params, false)}
            manualHref={calendarPickHref(
              PATH,
              params,
              `${period.date}T09:00`,
              null,
            )}
          />
        ) : null}
        <ScheduleFrame
          aside={
            week ? (
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
              adding={picking}
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
            booking && params.termin ? (
              <NewVisitPanel
                action={bookVisitAction}
                closeHref={calendarAddHref(PATH, params, false)}
                defaults={newVisitDefaults(
                  view.columns,
                  params.kolumna,
                  params.termin,
                )}
                offers={booking.offers}
                rooms={booking.rooms}
                specialists={booking.specialists}
              />
            ) : open ? (
              <VisitPanel
                closeHref={calendarPanelCloseHref(PATH, params)}
                events={open.events}
                row={open.row}
                tab={params.karta}
                tabs={calendarPanelTabs(PATH, params)}
                toolbar={
                  open.row.resendable ? (
                    <ResendPaymentLinkButton
                      action={resendPaymentLinkAction}
                      visitId={open.row.id}
                    />
                  ) : null
                }
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
    </FullBleed>
  );
}
