import { loadAdminCalendar } from "@/features/calendar/loaders";
import { CancelVisitButton } from "@/features/visits/cancel-visit";
import {
  findAvailability,
  formatDate,
  formatDateRangeShort,
  formatWeekday,
  mondayOf,
} from "@repo/scheduling";
import {
  AvailabilityPanel,
  calendarAvailabilityHref,
  calendarCollapseHref,
  calendarHref,
  calendarNav,
  calendarPanelCloseHref,
  calendarPanelTabs,
  calendarPerspectiveTabs,
  calendarViewTabs,
  calendarVisitHref,
  ComparisonSummaryPanel,
  DaySchedule,
  loadCalendarParams,
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
// the side panel (?wizyta=…), where the centre may cancel it. The
// bookings table is /rezerwacje.

const PATH = "/kalendarz";

export default async function CalendarPage({
  searchParams,
}: PageProps<"/kalendarz">) {
  const params = loadCalendarParams(await searchParams);
  const { today, period, locations, day, week, open } =
    await loadAdminCalendar(params);
  const context = { today, defaultView: "dzien" as const };
  const byRoom = params.perspektywa === "gabinety";
  const visitHref = (id: string) => calendarVisitHref(PATH, params, id);
  const availabilityHref = (key: string) =>
    calendarAvailabilityHref(PATH, params, key);
  const shown = findAvailability(
    day ? day.columns : (week?.days.flatMap((one) => one.lanes) ?? []),
    params.okno,
  );
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
          views={calendarViewTabs(PATH, params, context.defaultView)}
        />
        <ScheduleFrame
          aside={
            week && !open && !shown ? (
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
            open ? (
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
