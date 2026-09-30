import { loadMyCalendar } from "@/features/calendar/loaders";
import {
  CalendarLegend,
  CalendarToolbar,
  calendarNav,
  calendarPanelCloseHref,
  calendarPanelTabs,
  calendarViewTabs,
  calendarVisitHref,
  loadCalendarParams,
  ResourceCalendar,
} from "@repo/ui/calendar-view";
import { EmptyState, PageTitle } from "@repo/ui/portal-content";
import { VisitPanel } from "@repo/ui/visit-table";

// Mój kalendarz (stage K5): the specialist's week (or day), their visits
// over their availability; a visit's details open beside it (?wizyta=…).
// Changes go through the centre; hours are set in /dostepnosc.

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

  const { today, view, open } = calendar;
  const context = { today, defaultView: "tydzien" as const };
  return (
    <div className="space-y-3">
      <PageTitle>Mój kalendarz</PageTitle>
      <CalendarToolbar
        nav={calendarNav(PATH, params, context)}
        views={calendarViewTabs(PATH, params, context.defaultView)}
      />
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <ResourceCalendar
            ariaLabel={
              (params.widok ?? "tydzien") === "tydzien"
                ? "Mój tydzień"
                : "Mój dzień"
            }
            openVisitId={params.wizyta}
            view={view}
            visitHref={(id) => calendarVisitHref(PATH, params, id)}
          />
          <CalendarLegend />
        </div>
        {open ? (
          <VisitPanel
            closeHref={calendarPanelCloseHref(PATH, params)}
            events={open.events}
            row={open.row}
            tab={params.karta}
            tabs={calendarPanelTabs(PATH, params)}
          />
        ) : null}
      </div>
    </div>
  );
}
