// A roster of a few resources (the team, the rooms): a row each with the
// week at a glance, opening in place on tabs; the bars above it.
export { openTab, parseAsOpenRows, withRow, withTab } from "./open-rows";
export type { OpenRows } from "./open-rows";
export { DayRail } from "./day-rail";
export type { RailBlock } from "./day-rail";
export { LoadMeter, NowLine, WeekStrip } from "./roster-parts";
export type { StripDay } from "./roster-parts";
export { RosterOpenLink } from "./open-link";
export { RosterItem } from "./roster-item";
export type { RosterTab } from "./roster-item";
export { Roster, RosterBar, RosterEmpty, RosterWeek } from "./roster-bar";
export type { RosterSegment } from "./roster-bar";
export { SortMenu } from "./sort-menu";
export type { SortOption } from "./sort-menu";
export { rosterWeekNav, rosterWeekSummary, scheduleWeekNav } from "./week-nav";
export { matchesSearch, plainText } from "./search";
