// The calendar views (docs/product/scheduling-ui-plan.md, K5), after the AI
// Studio reference: the centre's day by specialist or room, the week
// compared, a specialist's own week; server-rendered, state in the URL, a
// visit's details in the side panel.
export {
  CALENDAR_PERSPECTIVES,
  CALENDAR_VIEWS,
  calendarAddHref,
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
  calendarPickHref,
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
export { AddVisitBanner, AddVisitButton } from "./add-visit";
export { AvailabilityPanel } from "./availability-panel";
export { MoveVisitPanel } from "./move-visit-panel";
export type { MoveVisitPanelProps } from "./move-visit-panel";
export { NewVisitPanel } from "./new-visit-panel";
export type { NewVisitOffer, NewVisitPanelProps } from "./new-visit-panel";
export { ScheduleCanvas } from "./schedule-controls";
export type { ScheduleSwitch } from "./schedule-controls";
export {
  ComparisonSummaryPanel,
  PersonalSummaryPanel,
} from "./schedule-summary";
export { ScheduleToolbar } from "./schedule-toolbar";
export { Figures, UpcomingVisitList, weekFigures } from "./week-figures";
export type { Figure } from "./week-figures";
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
