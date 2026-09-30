import { bookVisitAction } from "@/features/calendar/actions";
import { loadAdminCalendar } from "@/features/calendar/loaders";
import { CancelVisitButton } from "@/features/visits/cancel-visit";
import {
  findAvailability,
  formatDate,
  formatDateRangeShort,
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
  calendarCollapseHref,
  calendarHref,
  calendarNav,
  calendarPanelCloseHref,
  calendarPanelTabs,
  calendarPerspectiveTabs,
  calendarPickHref,
  calendarViewTabs,
  calendarVisitHref,
  ComparisonSummaryPanel,
  DaySchedule,
  loadCalendarParams,
  NewVisitPanel,
  ScheduleAgenda,
  ScheduleCanvas,
  ScheduleFrame,
  ScheduleToolbar,
  WeekAgenda,
  WeekComparison,
} from "@repo/ui/calendar-view";
import { PageTitle } from "@repo/ui/portal-content";
import { VisitPanel } from "@repo/ui/visit-table";

// Kalendarz (stage K5), after the AI Studio reference: the centre's day, a
// column per specialist or room (collapsible), or the week compared in
// narrow lanes with its summary. The address holds the state: the view,
// the date, the switches, the location, the search and the visit open in
// the side panel (?wizyta=…), where the centre may cancel it, and adding a
// visit ("+ Nowa wizyta": pick a place in the grid, the form opens). The
// bookings table is /rezerwacje.

const PATH = "/kalendarz";

export default async function CalendarPage({
  searchParams,
}: PageProps<"/kalendarz">) {
  const params = loadCalendarParams(await searchParams);
  const { today, period, locations, day, week, open, booking } =
    await loadAdminCalendar(params);
  const context = { today, defaultView: "dzien" as const };
  const byRoom = params.perspektywa === "gabinety";
  const visitHref = (id: string) => calendarVisitHref(PATH, params, id);
  const columns = day
    ? day.columns
    : (week?.days.flatMap((one) => one.lanes) ?? []);
  // Adding: the grid picks a time until the form is open.
  const picking = params.nowa && !params.termin;
  const availabilityHref = picking
    ? undefined
    : (key: string) => calendarAvailabilityHref(PATH, params, key);
  const shown = findAvailability(columns, params.okno);
  const empty = byRoom
    ? "Brak aktywnych gabinetów w tej lokalizacji."
    : "Brak aktywnych specjalistów.";

  return (
    <div className="space-y-4">
      <PageTitle>Kalendarz</PageTitle>
      <ScheduleCanvas className="space-y-4">
        <ScheduleToolbar
          locations={[
            ...locations,
            { value: "online", label: "Online / Zdalnie" },
          ]}
          nav={calendarNav(PATH, params, context)}
          perspectives={calendarPerspectiveTabs(PATH, params)}
          switches={
            week
              ? ["puste", "wyszarz", "wizyty", "dostepnosc", "podsumowanie"]
              : ["puste", "wyszarz", "wizyty", "dostepnosc"]
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
            week && !open && !shown && !booking ? (
              <ComparisonSummaryPanel
                byRoom={byRoom}
                period={`Tydzień ${formatDateRangeShort(period.from, period.to)}`}
                summary={week.summary}
              />
            ) : null
          }
          desktop={
            week ? (
              <WeekComparison
                adding={picking}
                availabilityHref={availabilityHref}
                ariaLabel={
                  byRoom ? "Porównanie gabinetów" : "Porównanie specjalistów"
                }
                byRoom={byRoom}
                openVisitId={params.wizyta}
                view={week}
                visitHref={visitHref}
              />
            ) : day ? (
              <DaySchedule
                adding={picking}
                availabilityHref={availabilityHref}
                ariaLabel="Kalendarz dnia"
                collapseHref={(key) => calendarCollapseHref(PATH, params, key)}
                collapsed={params.zwiniete}
                empty={empty}
                mode={byRoom ? "rooms" : "specialists"}
                openVisitId={params.wizyta}
                view={day}
                visitHref={visitHref}
              />
            ) : null
          }
          mobile={
            week ? (
              <WeekAgenda
                availabilityHref={availabilityHref}
                ariaLabel={
                  byRoom ? "Porównanie gabinetów" : "Porównanie specjalistów"
                }
                byRoom={byRoom}
                dayHref={(date) =>
                  calendarHref(PATH, params, { data: date, wizyta: null })
                }
                openVisitId={params.wizyta}
                selected={params.data ?? today}
                view={week}
                visitHref={visitHref}
              />
            ) : day ? (
              <ScheduleAgenda
                availabilityHref={availabilityHref}
                ariaLabel="Kalendarz dnia"
                byRoom={byRoom}
                columns={day.columns}
                empty={empty}
                openVisitId={params.wizyta}
                visitHref={visitHref}
              />
            ) : null
          }
          panel={
            booking && params.termin ? (
              <NewVisitPanel
                action={bookVisitAction}
                closeHref={calendarAddHref(PATH, params, false)}
                defaults={newVisitDefaults(
                  columns,
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
                  open.row.cancellable ? (
                    <CancelVisitButton
                      visit={{
                        id: open.row.id,
                        reference: open.row.reference,
                        label: `${open.row.clientName}, ${open.row.weekday}, ${open.row.dateLabel}, ${open.row.time}`,
                        paid: open.row.paid,
                        email: open.row.email,
                      }}
                    />
                  ) : null
                }
              />
            ) : shown ? (
              <AvailabilityPanel
                closeHref={calendarPanelCloseHref(PATH, params)}
                column={shown.column}
                dateLabel={`${formatWeekday(shown.column.date)}, ${formatDate(shown.column.date)}`}
                manage={
                  shown.column.kind === "specialist"
                    ? {
                        href: `/specjalisci/${shown.column.key}`,
                        label: "Profil specjalisty",
                      }
                    : shown.column.kind === "room"
                      ? {
                          href: `/gabinety/${shown.column.key}?tydzien=${mondayOf(shown.column.date)}`,
                          label: "Grafik gabinetu",
                        }
                      : undefined
                }
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
