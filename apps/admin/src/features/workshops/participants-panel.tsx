"use client";

import { formatMinor, parseZloty } from "@repo/contracts/discount-codes";
import type {
  WorkshopMessage,
  WorkshopParticipant,
} from "@repo/supabase/workshops-admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { Tag } from "@repo/ui/visit-table";
import { Download, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { TextField } from "@/features/cms/text-field";
import { useSave } from "@/lib/use-save";
import {
  addParticipantAction,
  cancelParticipantAction,
  completeWorkshopAction,
  forgetParticipantAction,
  messageParticipantsAction,
  setAttendanceAction,
} from "./actions";
import {
  canForget,
  participantGroups,
  participantState,
  paymentLabel,
  refundable,
} from "./participants-view";

// A workshop's participants in the portal (docs/product/workshops-plan.md,
// PR 6): those signed up, the waitlist in its order and those who left;
// each with contact, how they paid, and (once it began) whether they came.
// The admin adds someone (paid outside the site, or with the link to pay),
// cancels one (giving back what they choose), writes to everyone, takes
// the list as a CSV file and closes the workshop once it ended.

const GROUPS = [
  { key: "zapisani", title: "Zapisani" },
  { key: "lista", title: "Lista rezerwowa" },
  { key: "anulowani", title: "Rezygnacje i anulowane" },
] as const;

export function ParticipantsPanel({
  workshopId,
  slug,
  participants,
  messages,
  started,
  ended,
  status,
}: {
  workshopId: string;
  slug: string;
  participants: readonly WorkshopParticipant[];
  messages: readonly WorkshopMessage[];
  started: boolean;
  ended: boolean;
  status: "draft" | "published" | "cancelled" | "completed";
}) {
  const { isPending, run } = useSave();
  const [adding, setAdding] = useState(false);
  const [writing, setWriting] = useState(false);
  const [forgetting, setForgetting] = useState<WorkshopParticipant | null>(
    null,
  );
  const [cancelling, setCancelling] = useState<WorkshopParticipant | null>(
    null,
  );
  const [refund, setRefund] = useState("");
  const groups = participantGroups(participants);
  const open = status === "published";
  const head =
    "h-8 border-b border-[var(--border)] px-3 text-left text-[0.75rem] font-medium text-[var(--text-muted)]";
  const cell = "h-[30px] border-b border-[var(--border)] px-3 text-[0.8125rem]";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {open ? (
          <Button
            onClick={() => setAdding((now) => !now)}
            size="sm"
            variant="outline"
          >
            <UserPlus aria-hidden="true" className="size-4" />
            Dodaj uczestnika
          </Button>
        ) : null}
        {groups.zapisani.length && status !== "cancelled" ? (
          <Button
            onClick={() => setWriting((now) => !now)}
            size="sm"
            variant="outline"
          >
            <Mail aria-hidden="true" className="size-4" />
            Wiadomość do wszystkich
          </Button>
        ) : null}
        {participants.length ? (
          <Button asChild size="sm" variant="outline">
            <a download href={`/warsztaty/${workshopId}/uczestnicy.csv`}>
              <Download aria-hidden="true" className="size-4" />
              Lista (CSV)
            </a>
          </Button>
        ) : null}
        {status === "published" && ended ? (
          <Button
            disabled={isPending}
            onClick={() =>
              run(
                () => completeWorkshopAction(workshopId, slug),
                "Warsztat zakończony",
              )
            }
            size="sm"
          >
            Zakończ warsztat
          </Button>
        ) : null}
      </div>

      {adding ? (
        <AddParticipant
          onDone={() => setAdding(false)}
          workshopId={workshopId}
        />
      ) : null}
      {writing ? (
        <WriteToAll onDone={() => setWriting(false)} workshopId={workshopId} />
      ) : null}

      {participants.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Nikt się jeszcze nie zapisał.
        </p>
      ) : (
        GROUPS.map(({ key, title }) =>
          groups[key].length ? (
            <div className="grid gap-1" key={key}>
              <h3 className="text-sm font-semibold">
                {title} ({groups[key].length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <caption className="sr-only">{title}</caption>
                  <thead>
                    <tr>
                      <th className={head} scope="col">
                        Uczestnik
                      </th>
                      <th
                        className={`${head} hidden md:table-cell`}
                        scope="col"
                      >
                        Kontakt
                      </th>
                      <th className={head} scope="col">
                        Stan
                      </th>
                      <th
                        className={`${head} hidden sm:table-cell`}
                        scope="col"
                      >
                        Wpłata
                      </th>
                      {key === "zapisani" && started ? (
                        <th className={head} scope="col">
                          Obecność
                        </th>
                      ) : null}
                      <th className={head} scope="col">
                        <span className="sr-only">Akcje</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups[key].map((one) => {
                      const state = participantState(one);
                      return (
                        <tr key={one.id}>
                          <th
                            className={`${cell} text-left font-medium`}
                            scope="row"
                          >
                            {one.name ?? "—"}
                            <span className="ml-2 font-normal text-[var(--text-muted)] tabular-nums">
                              {one.reference}
                            </span>
                            {one.notes ? (
                              <span className="block font-normal text-[var(--text-muted)]">
                                {one.notes}
                              </span>
                            ) : null}
                          </th>
                          <td
                            className={`${cell} hidden text-[var(--text-muted)] md:table-cell`}
                          >
                            {[one.email, one.phone]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </td>
                          <td className={cell}>
                            <Tag tone={state.tone}>{state.label}</Tag>
                          </td>
                          <td
                            className={`${cell} hidden tabular-nums sm:table-cell`}
                          >
                            {paymentLabel(one, formatMinor)}
                          </td>
                          {key === "zapisani" && started ? (
                            <td className={cell}>
                              {one.status === "confirmed" ? (
                                <label className="flex items-center gap-1.5">
                                  <input
                                    checked={one.attended === true}
                                    className="size-4 accent-[var(--primary)]"
                                    disabled={isPending}
                                    onChange={(event) =>
                                      run(
                                        () =>
                                          setAttendanceAction(
                                            workshopId,
                                            one.id,
                                            event.target.checked,
                                          ),
                                        "Zapisano obecność",
                                      )
                                    }
                                    type="checkbox"
                                  />
                                  Był(a)
                                </label>
                              ) : null}
                            </td>
                          ) : null}
                          <td className={`${cell} text-right`}>
                            {key !== "anulowani" && open && !started ? (
                              <Button
                                onClick={() => {
                                  setCancelling(one);
                                  setRefund(
                                    (refundable(one) / 100)
                                      .toFixed(2)
                                      .replace(".", ","),
                                  );
                                }}
                                size="sm"
                                variant="ghost"
                              >
                                Wypisz
                              </Button>
                            ) : null}
                            {canForget(one, { ended }) ? (
                              <Button
                                onClick={() => setForgetting(one)}
                                size="sm"
                                variant="ghost"
                              >
                                Usuń dane
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null,
        )
      )}

      {messages.length ? (
        <div className="grid gap-1">
          <h3 className="text-sm font-semibold">Wysłane wiadomości</h3>
          <ul className="grid gap-1 text-[0.8125rem]">
            {messages.map((message) => (
              <li key={message.id}>
                <span className="font-medium">{message.subject}</span>{" "}
                <span className="text-[var(--text-muted)]">
                  ({message.recipients} os.,{" "}
                  {new Date(message.createdAt).toLocaleString("pl-PL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                  )
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AlertDialog
        onOpenChange={(isOpen) => setForgetting(isOpen ? forgetting : null)}
        open={forgetting !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Usunąć dane: {forgetting?.name ?? "uczestnik"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Na prośbę tej osoby: imię, e-mail, telefon i uwagi znikną na
              zawsze, także z powiadomień. Zostają numer zapisu i kwoty (do
              księgowości). Bez prośby dane znikają same 12 miesięcy po
              warsztacie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nie</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!forgetting) return;
                const target = forgetting;
                run(
                  () => forgetParticipantAction(workshopId, target.id),
                  "Dane usunięte",
                  () => setForgetting(null),
                );
              }}
            >
              Usuń dane
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={(isOpen) => setCancelling(isOpen ? cancelling : null)}
        open={cancelling !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Wypisać {cancelling?.name ?? "uczestnika"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Miejsce się zwolni (dostanie je pierwsza osoba z listy
              rezerwowej), a uczestnik dostanie e-mail.
              {cancelling?.paidOutside
                ? " Wpłatę poza stroną rozlicz bezpośrednio."
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cancelling && refundable(cancelling) > 0 ? (
            <TextField
              hint={`Najwyżej ${formatMinor(refundable(cancelling))}; 0: bez zwrotu.`}
              id="participant-refund"
              label="Zwrot (zł)"
              maxLength={10}
              onChange={setRefund}
              value={refund}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Nie</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!cancelling) return;
                const refundMinor =
                  refundable(cancelling) > 0 ? parseZloty(refund) : 0;
                if (refundMinor === null) return;
                const target = cancelling;
                run(
                  () =>
                    cancelParticipantAction(workshopId, target.id, refundMinor),
                  refundMinor > 0 ? "Wypisano, zwrot wysłany" : "Wypisano",
                  () => setCancelling(null),
                );
              }}
            >
              Wypisz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddParticipant({
  workshopId,
  onDone,
}: {
  workshopId: string;
  onDone: () => void;
}) {
  const { isPending, run } = useSave();
  const [person, setPerson] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    paidOutside: true,
  });
  const change = (patch: Partial<typeof person>) =>
    setPerson((now) => ({ ...now, ...patch }));
  return (
    <form
      className="grid gap-3 rounded-[var(--radius-control)] border border-[var(--border)] p-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => addParticipantAction(workshopId, person),
          "Dodano uczestnika",
          onDone,
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          id="add-name"
          label="Imię i nazwisko"
          maxLength={200}
          onChange={(name) => change({ name })}
          value={person.name}
        />
        <TextField
          id="add-email"
          label="E-mail"
          maxLength={320}
          onChange={(email) => change({ email })}
          value={person.email}
        />
        <TextField
          id="add-phone"
          label="Telefon (opcjonalnie)"
          maxLength={40}
          onChange={(phone) => change({ phone })}
          value={person.phone}
        />
        <TextField
          id="add-notes"
          label="Uwagi (opcjonalnie)"
          maxLength={1000}
          onChange={(notes) => change({ notes })}
          value={person.notes}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={person.paidOutside}
          className="size-4 accent-[var(--primary)]"
          onChange={(event) => change({ paidOutside: event.target.checked })}
          type="checkbox"
        />
        Zapłacił(a) poza stroną (przelew, gotówka): potwierdź od razu
      </label>
      <p className="text-[0.75rem] text-[var(--text-muted)]">
        Bez zaznaczenia uczestnik dostanie e-mail z linkiem do zapłaty.
      </p>
      <div className="flex gap-2">
        <Button
          disabled={isPending}
          loading={isPending}
          size="sm"
          type="submit"
        >
          Dodaj
        </Button>
        <Button onClick={onDone} size="sm" type="button" variant="outline">
          Anuluj
        </Button>
      </div>
    </form>
  );
}

function WriteToAll({
  workshopId,
  onDone,
}: {
  workshopId: string;
  onDone: () => void;
}) {
  const { isPending, run } = useSave();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  return (
    <form
      className="grid gap-3 rounded-[var(--radius-control)] border border-[var(--border)] p-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => messageParticipantsAction(workshopId, { subject, body }),
          "Wiadomość wysłana",
          onDone,
        );
      }}
    >
      <TextField
        id="message-subject"
        label="Temat"
        maxLength={200}
        onChange={setSubject}
        value={subject}
      />
      <TextField
        hint="Dostaną ją wszyscy zapisani (także czekający na wpłatę)."
        id="message-body"
        label="Wiadomość"
        maxLength={5000}
        multiline
        onChange={setBody}
        rows={5}
        value={body}
      />
      <div className="flex gap-2">
        <Button
          disabled={isPending}
          loading={isPending}
          size="sm"
          type="submit"
        >
          Wyślij
        </Button>
        <Button onClick={onDone} size="sm" type="button" variant="outline">
          Anuluj
        </Button>
      </div>
    </form>
  );
}
