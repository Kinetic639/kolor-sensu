import { ShieldCheck } from "lucide-react";

// After choosing a time: it is held for the client for a few minutes
// (hold_minutes), while they fill in their details and pay.

export function HoldNotice({ until }: { until: string }) {
  return (
    <p
      className="rounded-card-sm bg-primary-soft text-small text-ink flex gap-3 p-4"
      role="status"
    >
      <ShieldCheck
        aria-hidden="true"
        className="text-primary-strong size-5 shrink-0"
      />
      <span>
        <strong className="block font-semibold">
          Twój termin jest tymczasowo zarezerwowany
        </strong>
        do {until}. Przejdź dalej, aby podać swoje dane i potwierdzić wizytę.
      </span>
    </p>
  );
}
