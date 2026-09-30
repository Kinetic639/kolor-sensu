// The calendar views (docs/product/scheduling-ui-plan.md, K5), after the AI
// Studio reference: the centre's day by specialist or room, the week
// compared, a specialist's own week; server-rendered, state in the URL, a
// visit's details in the side panel.
export {
  CALENDAR_PERSPECTIVES,
  CALENDAR_VIEWS,
  calendarAvailabilityHref,
  calendarCollapseHref,
  calendarDisplayParsers,
  calendarHref,
  calendarNav,
  calendarPanelCloseHref,
  calendarPanelTabs,
  calendarParsers,
  calendarPeriod,
  calendarPerspectiveTabs,
  calendarViewTabs,
  calendarVisitHref,
  dayLabel,
  loadCalendarParams,
} from "./params";
export type {
  CalendarParams,
  CalendarPerspectiveParam,
  CalendarView,
} from "./params";
export { AvailabilityPanel } from "./availability-panel";
export { ScheduleCanvas } from "./schedule-controls";
export type { ScheduleSwitch } from "./schedule-controls";
export {
  ComparisonSummaryPanel,
  PersonalSummaryPanel,
} from "./schedule-summary";
export { ScheduleToolbar } from "./schedule-toolbar";
export type {
  ScheduleNav,
  ScheduleToolbarProps,
  SegmentLink,
} from "./schedule-toolbar";
export { ScheduleAgenda, WeekAgenda } from "./schedule-agenda";
export type { ScheduleAgendaProps } from "./schedule-agenda";
export { DaySchedule, ScheduleFrame, WeekComparison } from "./schedule-views";
export type {
  DayScheduleProps,
  ScheduleMode,
  WeekComparisonProps,
} from "./schedule-views";
