import { bookVisitAction } from "@/features/calendar/actions";
import { moveVisitAsCentreAction } from "@/features/visits/actions";
import { loadAdminCalendar } from "@/features/calendar/loaders";
import { CentreVisitToolbar } from "@/features/visits/cancel-visit";
import {
  findAvailability,
  formatDate,
  formatDateRangeShort,
  formatWeekday,
  mondayOf,
  moveVisitDefaults,
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
  MoveVisitPanel,
  NewVisitPanel,
  ScheduleAgenda,
  ScheduleCanvas,
  ScheduleFrame,
  ScheduleToolbar,
  WeekAgenda,
  WeekComparison,
} from "@repo/ui/calendar-view";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { VisitPanel } from "@repo/ui/visit-table";

// Kalendarz (stage K5), after the AI Studio reference: the centre's day, a
// column per specialist or room (collapsible), or the week compared in
// narrow lanes with its summary. The address holds the state: the view,
// the date, the switches, the location, the search and the visit open in
// the side panel (?wizyta=…), where the centre may cancel it or give money
// back, adding a visit ("+ Nowa wizyta": pick a place in the grid, the form
// opens) and moving one (?przesun=…, R12: the same picking, then the move's
// form). The bookings table is /rezerwacje.

const PATH = "/kalendarz";

export default async function CalendarPage({
  searchParams,
}: PageProps<"/kalendarz">) {
  const params = loadCalendarParams(await searchParams);
  const { today, period, locations, day, week, open, booking, move } =
    await loadAdminCalendar(params);
  const context = { today, defaultView: "dzien" as const };
  const byRoom = params.perspektywa === "gabinety";
  const visitHref = (id: string) => calendarVisitHref(PATH, params, id);
  const columns = day
    ? day.columns
    : (week?.days.flatMap((one) => one.lanes) ?? []);
  // Adding or moving: the grid picks a time until the form is open.
  const picking = (params.nowa || Boolean(move)) && !params.termin;
  const availabilityHref = picking
    ? undefined
    : (key: string) => calendarAvailabilityHref(PATH, params, key);
  const shown = findAvailability(columns, params.okno);
  const empty = byRoom
    ? "Brak aktywnych gabinetów w tej lokalizacji."
    : "Brak aktywnych specjalistów.";

  return (
    <FullBleed>
      <PageTitle>Kalendarz</PageTitle>
      <ScheduleCanvas className="flex min-h-0 flex-1 flex-col">
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
              active={params.nowa || Boolean(move)}
              href={calendarAddHref(
                PATH,
                params,
                !(params.nowa || Boolean(move)),
              )}
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
              move
                ? `${move.row.date}T${move.row.time.slice(0, 5)}`
                : `${period.date}T09:00`,
              null,
            )}
            moving={
              move
                ? {
                    reference: move.row.reference,
                    label: `${move.row.clientName}, ${move.row.weekday}, ${move.row.dateLabel}, ${move.row.time}`,
                  }
                : undefined
            }
          />
        ) : null}
        <ScheduleFrame
          aside={
            week ? (
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
            move && params.termin ? (
              <MoveVisitPanel
                action={moveVisitAsCentreAction}
                closeHref={calendarAddHref(PATH, params, false)}
                defaults={moveVisitDefaults(
                  columns,
                  params.kolumna,
                  params.termin,
                  move.row,
                )}
                rooms={move.rooms}
                visit={{
                  id: move.row.id,
                  reference: move.row.reference,
                  clientName: move.row.clientName,
                  serviceName: move.row.serviceName,
                  specialistName: move.row.specialistName,
                  current: `${move.row.weekday}, ${move.row.dateLabel}, ${move.row.time} · ${move.row.room}`,
                }}
              />
            ) : booking && params.termin ? (
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
                  <CentreVisitToolbar
                    label={`${open.row.clientName}, ${open.row.weekday}, ${open.row.dateLabel}, ${open.row.time}`}
                    row={open.row}
                  />
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
    </FullBleed>
  );
}
