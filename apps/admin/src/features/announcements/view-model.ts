import {
  announcementDates,
  announcementState,
  type Announcement,
} from "@repo/contracts/announcements";

// The announcements as the admin's list shows them: the one on the site
// now first, then those to come (the soonest first), then the past ones
// (the latest first); each with its state in words and its days.

const STATES = {
  current: { label: "Na stronie teraz", tone: "success", order: 0 },
  scheduled: { label: "Zaplanowane", tone: "info", order: 1 },
  past: { label: "Zakończone", tone: "neutral", order: 2 },
} as const;

export type AnnouncementRow = Announcement & {
  state: keyof typeof STATES;
  stateLabel: string;
  tone: (typeof STATES)[keyof typeof STATES]["tone"];
  /** `10.12–23.12.2026` */
  dates: string;
};

export function announcementRows(
  announcements: Announcement[],
  today: string,
): AnnouncementRow[] {
  return announcements
    .map((one) => {
      const state = announcementState(one, today);
      return {
        ...one,
        state,
        stateLabel: STATES[state].label,
        tone: STATES[state].tone,
        dates: announcementDates(one),
      };
    })
    .sort((a, b) => {
      const byState = STATES[a.state].order - STATES[b.state].order;
      if (byState) return byState;
      return a.state === "scheduled"
        ? a.startsOn.localeCompare(b.startsOn)
        : b.startsOn.localeCompare(a.startsOn);
    });
}
