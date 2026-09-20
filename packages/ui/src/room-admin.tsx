import { StatusBadge } from "./portal-content";

export function RoomStatusBadges({
  active,
  publiclyVisible,
  publicProfilePublished,
}: {
  active: boolean;
  publiclyVisible: boolean;
  publicProfilePublished?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <StatusBadge tone={active ? "success" : "neutral"}>
        {active ? "Aktywny" : "Nieaktywny"}
      </StatusBadge>
      <StatusBadge tone={publiclyVisible ? "info" : "neutral"}>
        {publiclyVisible ? "Publiczny" : "Prywatny"}
      </StatusBadge>
      {publicProfilePublished === undefined ? null : (
        <StatusBadge tone={publicProfilePublished ? "success" : "neutral"}>
          {publicProfilePublished
            ? "Profil opublikowany"
            : "Profil nieopublikowany"}
        </StatusBadge>
      )}
    </div>
  );
}

const exceptionLabels = {
  closed_all_day: "Zamknięte cały dzień",
  blocked_interval: "Blokada godzinowa",
  extra_available_interval: "Dodatkowa dostępność",
} as const;

export function RoomAvailabilityExceptionItem({
  date,
  type,
  startsAt,
  endsAt,
  reason,
  actions,
}: {
  date: string;
  type: keyof typeof exceptionLabels;
  startsAt?: string | null;
  endsAt?: string | null;
  reason?: string | null;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <strong>{date}</strong>
          <StatusBadge
            tone={
              type === "extra_available_interval"
                ? "success"
                : type === "closed_all_day"
                  ? "danger"
                  : "warning"
            }
          >
            {exceptionLabels[type]}
          </StatusBadge>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {startsAt && endsAt ? `${startsAt}–${endsAt}` : "Cały dzień"}
          {reason ? ` · ${reason}` : ""}
        </p>
      </div>
      {actions}
    </div>
  );
}
