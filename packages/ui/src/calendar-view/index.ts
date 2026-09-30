// The calendar views (docs/product/scheduling-ui-plan.md, K5): a day by
// specialist or room, a week of one of them; server-rendered, state in
// the URL, a visit's details in the side panel.
export {
  CALENDAR_PERSPECTIVES,
  CALENDAR_VIEWS,
  calendarHref,
  calendarNav,
  calendarPanelCloseHref,
  calendarPanelTabs,
  calendarParsers,
  calendarPeriod,
  calendarPerspectiveTabs,
  calendarViewTabs,
  calendarVisitHref,
  loadCalendarParams,
} from "./params";
export type {
  CalendarParams,
  CalendarPerspectiveParam,
  CalendarView,
} from "./params";
export { CalendarLegend, CalendarToolbar } from "./calendar-toolbar";
export type {
  CalendarResourceTab,
  CalendarToolbarProps,
} from "./calendar-toolbar";
export { ResourceCalendar } from "./resource-calendar";
export type { ResourceCalendarProps } from "./resource-calendar";
