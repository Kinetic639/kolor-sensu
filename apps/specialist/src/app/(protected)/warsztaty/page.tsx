import {
  listLedWorkshops,
  listWorkshopParticipants,
} from "@repo/supabase/workshops-admin";
import { EmptyState, PageTitle } from "@repo/ui/portal-content";
import { Tag } from "@repo/ui/visit-table";
import { AttendanceBox } from "@/features/workshops/attendance-box";
import { createClient } from "@/lib/supabase/server";

// Moje warsztaty (docs/product/workshops-plan.md, PR 6): the workshops this
// specialist leads (main or co-leader), the coming ones first, each with
// the people signed up (their contact, as the centre decided), the
// waitlist's length, and once it began, who came. The database shows them
// only their own workshops.

const ZONE = "Europe/Warsaw";
const when = (startsAt: string, endsAt: string) => {
  const day = new Intl.DateTimeFormat("pl-PL", {
    timeZone: ZONE,
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(startsAt));
  const clock = (instant: string) =>
    new Intl.DateTimeFormat("pl-PL", {
      timeZone: ZONE,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(instant));
  return `${day}, ${clock(startsAt)}–${clock(endsAt)}`;
};

export default async function MyWorkshopsPage() {
  const client = await createClient();
  const workshops = await listLedWorkshops(client).catch(() => []);
  const now = Date.now();
  // The coming ones first, then the last few that ended.
  const shown = [
    ...workshops.filter((one) => new Date(one.endsAt).getTime() > now),
    ...workshops
      .filter((one) => new Date(one.endsAt).getTime() <= now)
      .reverse()
      .slice(0, 5),
  ];
  const lists = await Promise.all(
    shown.map((one) =>
      listWorkshopParticipants(client, one.id).catch(() => []),
    ),
  );

  return (
    <div className="space-y-5">
      <PageTitle>Moje warsztaty</PageTitle>
      {shown.length === 0 ? (
        <EmptyState
          title="Nie prowadzisz jeszcze warsztatów"
          description="Gdy centrum doda warsztat z Tobą jako prowadzącym, zobaczysz go tutaj razem z listą uczestników."
        />
      ) : (
        shown.map((workshop, index) => {
          const people = lists[index] ?? [];
          const signed = people.filter(
            (one) =>
              one.status === "confirmed" || one.status === "awaiting_payment",
          );
          const waiting = people.filter(
            (one) => one.status === "waitlisted" || one.status === "offered",
          ).length;
          const started = new Date(workshop.startsAt).getTime() <= now;
          return (
            <section
              aria-labelledby={`warsztat-${workshop.id}`}
              className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)]"
              key={workshop.id}
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-3 py-2">
                <h2
                  className="text-[0.9375rem] font-semibold"
                  id={`warsztat-${workshop.id}`}
                >
                  {workshop.title}
                </h2>
                <span className="text-[0.8125rem] text-[var(--text-muted)]">
                  {when(workshop.startsAt, workshop.endsAt)} ·{" "}
                  {workshop.modality === "online" ? "online" : "stacjonarnie"}
                </span>
                {workshop.status === "cancelled" ? (
                  <Tag tone="warning">Odwołany</Tag>
                ) : (
                  <Tag tone="neutral">
                    {signed.length} / {workshop.capacity}
                    {waiting ? ` · ${waiting} na liście` : ""}
                  </Tag>
                )}
              </div>
              {signed.length === 0 ? (
                <p className="px-3 py-3 text-sm text-[var(--text-muted)]">
                  Nikt się jeszcze nie zapisał.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {signed.map((person) => (
                    <li
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[0.8125rem]"
                      key={person.id}
                    >
                      <span className="font-medium">{person.name ?? "—"}</span>
                      <span className="text-[var(--text-muted)]">
                        {[person.email, person.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {person.status === "awaiting_payment" ? (
                        <Tag tone="warning">Czeka na wpłatę</Tag>
                      ) : null}
                      {person.notes ? (
                        <span className="w-full text-[var(--text-muted)]">
                          {person.notes}
                        </span>
                      ) : null}
                      {started && person.status === "confirmed" ? (
                        <span className="ml-auto">
                          <AttendanceBox
                            attended={person.attended === true}
                            name={person.name ?? "Uczestnik"}
                            registrationId={person.id}
                          />
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
