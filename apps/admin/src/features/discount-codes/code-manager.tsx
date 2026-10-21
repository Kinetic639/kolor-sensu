"use client";

import { TextField } from "@/features/cms/text-field";
import { useSave } from "@/lib/use-save";
import {
  DISCOUNT_STATE_LABELS,
  discountCodeState,
  discountLabel,
  formatMinor,
  parseZloty,
  type DiscountCode,
  type DiscountCodeInput,
  type DiscountKind,
} from "@repo/contracts/discount-codes";
import { Button } from "@repo/ui/button";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { Tag } from "@repo/ui/visit-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteDiscountCodeAction, saveDiscountCodeAction } from "./actions";

// Kody rabatowe: the codes as a compact table (few, all at once): the
// code, its discount, its dates, whether it works today, how often it was
// used and what it took off; "Edytuj" opens it in place, a new one is added
// above the list. A used code cannot be deleted, only switched off.

const STATE_TONES = {
  active: "success",
  off: "neutral",
  planned: "info",
  ended: "warning",
} as const;

const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const day = (iso: string) => DATE.format(new Date(`${iso}T00:00:00Z`));

function dates(code: Pick<DiscountCode, "startsOn" | "endsOn">): string {
  if (code.startsOn && code.endsOn)
    return `${day(code.startsOn)} – ${day(code.endsOn)}`;
  if (code.startsOn) return `od ${day(code.startsOn)}`;
  if (code.endsOn) return `do ${day(code.endsOn)}`;
  return "bez terminu";
}

export function DiscountCodeManager({
  codes,
  today,
}: {
  codes: readonly DiscountCode[];
  /** The centre's day, YYYY-MM-DD. */
  today: string;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(
    codes.length ? null : "new",
  );
  const head =
    "h-8 border-b border-[var(--border)] px-3 text-left text-[0.75rem] font-medium text-[var(--text-muted)]";
  const cell = "h-[30px] border-b border-[var(--border)] px-3 text-[0.8125rem]";

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
        <p className="text-sm text-[var(--text-muted)]">
          Klient wpisuje kod przy rezerwacji, na kroku z danymi. Kod działa w
          swoich datach, dopóki jest włączony.
        </p>
        {editing !== "new" ? (
          <Button onClick={() => setEditing("new")} size="sm">
            <Plus aria-hidden="true" className="size-4" />
            Nowy kod
          </Button>
        ) : null}
      </div>
      {editing === "new" ? (
        <section
          aria-labelledby="new-code-title"
          className="mx-3.5 grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3"
        >
          <h2 className="text-sm font-semibold" id="new-code-title">
            Nowy kod rabatowy
          </h2>
          <CodeForm id={null} onDone={() => setEditing(null)} />
        </section>
      ) : null}
      {codes.length === 0 ? null : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <caption className="sr-only">Kody rabatowe</caption>
            <thead>
              <tr>
                <th className={head} scope="col">
                  Kod
                </th>
                <th className={head} scope="col">
                  Rabat
                </th>
                <th className={`${head} hidden md:table-cell`} scope="col">
                  Ważny
                </th>
                <th className={head} scope="col">
                  Stan
                </th>
                <th className={`${head} hidden sm:table-cell`} scope="col">
                  Użyty
                </th>
                <th className={`${head} hidden lg:table-cell`} scope="col">
                  Rabat łącznie
                </th>
                <th className={head} scope="col">
                  <span className="sr-only">Akcje</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) =>
                editing === code.id ? (
                  <tr key={code.id}>
                    <td
                      className="border-b border-[var(--border)] p-3"
                      colSpan={7}
                    >
                      <CodeForm
                        id={code.id}
                        initial={code}
                        onDone={() => setEditing(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr
                    className="hover:bg-[var(--surface-subtle)]"
                    key={code.id}
                  >
                    <th
                      className={`${cell} text-left font-mono font-medium`}
                      scope="row"
                    >
                      {code.code}
                      {code.note ? (
                        <span className="ml-2 font-sans font-normal text-[var(--text-muted)]">
                          {code.note}
                        </span>
                      ) : null}
                    </th>
                    <td className={`${cell} tabular-nums`}>
                      {discountLabel(code)}
                    </td>
                    <td
                      className={`${cell} hidden text-[var(--text-muted)] md:table-cell`}
                    >
                      {dates(code)}
                    </td>
                    <td className={cell}>
                      <Tag tone={STATE_TONES[discountCodeState(code, today)]}>
                        {DISCOUNT_STATE_LABELS[discountCodeState(code, today)]}
                      </Tag>
                    </td>
                    <td className={`${cell} hidden tabular-nums sm:table-cell`}>
                      {code.usedCount}
                    </td>
                    <td className={`${cell} hidden tabular-nums lg:table-cell`}>
                      {formatMinor(code.discountTotalMinor)}
                    </td>
                    <td className={`${cell} text-right whitespace-nowrap`}>
                      <button
                        aria-label={`Edytuj kod ${code.code}`}
                        className={DETAIL_BUTTON}
                        onClick={() => setEditing(code.id)}
                        type="button"
                      >
                        <Pencil aria-hidden="true" />
                      </button>{" "}
                      <DeleteCode code={code} />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const FIELD =
  "w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]";

function CodeForm({
  id,
  initial,
  onDone,
}: {
  id: string | null;
  initial?: DiscountCode;
  onDone: () => void;
}) {
  const { isPending, run } = useSave();
  const prefix = id ?? "new";
  const [code, setCode] = useState(initial?.code ?? "");
  const [kind, setKind] = useState<DiscountKind>(initial?.kind ?? "percent");
  const [value, setValue] = useState(
    initial
      ? initial.kind === "percent"
        ? String(initial.value)
        : (initial.value / 100).toFixed(2).replace(".", ",")
      : "",
  );
  const [startsOn, setStartsOn] = useState(initial?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(initial?.endsOn ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [note, setNote] = useState(initial?.note ?? "");

  function submit() {
    const amount = kind === "percent" ? Number(value) : parseZloty(value);
    const input: DiscountCodeInput = {
      code,
      kind,
      value: Number.isInteger(amount) ? (amount as number) : 0,
      startsOn: startsOn || null,
      endsOn: endsOn || null,
      active,
      note,
    };
    run(() => saveDiscountCodeAction(id, input), "Zapisano kod", onDone);
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          hint="Np. JESIEN20: litery, cyfry, - lub _."
          id={`${prefix}-code`}
          label="Kod"
          maxLength={32}
          onChange={(next) => setCode(next.toUpperCase())}
          value={code}
        />
        <div className="grid content-start gap-1">
          <label className="text-sm font-medium" htmlFor={`${prefix}-kind`}>
            Rodzaj rabatu
          </label>
          <select
            className={FIELD}
            id={`${prefix}-kind`}
            onChange={(event) => setKind(event.target.value as DiscountKind)}
            value={kind}
          >
            <option value="percent">Procent</option>
            <option value="amount">Kwota</option>
          </select>
        </div>
        <TextField
          hint={kind === "percent" ? "Od 1 do 100." : "Np. 50 albo 49,99."}
          id={`${prefix}-value`}
          label={kind === "percent" ? "Rabat (%)" : "Rabat (zł)"}
          maxLength={10}
          onChange={setValue}
          value={value}
        />
        <TextField
          hint="Widzi go tylko zespół."
          id={`${prefix}-note`}
          label="Notatka"
          maxLength={300}
          onChange={setNote}
          value={note}
        />
        <div className="grid content-start gap-1">
          <label className="text-sm font-medium" htmlFor={`${prefix}-starts`}>
            Działa od (opcjonalnie)
          </label>
          <input
            className={FIELD}
            id={`${prefix}-starts`}
            onChange={(event) => setStartsOn(event.target.value)}
            type="date"
            value={startsOn}
          />
        </div>
        <div className="grid content-start gap-1">
          <label className="text-sm font-medium" htmlFor={`${prefix}-ends`}>
            Działa do (opcjonalnie)
          </label>
          <input
            className={FIELD}
            id={`${prefix}-ends`}
            onChange={(event) => setEndsOn(event.target.value)}
            type="date"
            value={endsOn}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            checked={active}
            className="size-4 accent-[var(--primary)]"
            onChange={(event) => setActive(event.target.checked)}
            type="checkbox"
          />
          Kod włączony
        </label>
      </div>
      <div className="flex gap-2">
        <Button
          disabled={isPending}
          loading={isPending}
          size="sm"
          type="submit"
        >
          Zapisz
        </Button>
        <Button onClick={onDone} size="sm" type="button" variant="outline">
          Anuluj
        </Button>
      </div>
    </form>
  );
}

function DeleteCode({ code }: { code: DiscountCode }) {
  const { isPending, run } = useSave();
  const used = code.usedCount > 0;
  return (
    <button
      aria-label={`Usuń kod ${code.code}`}
      className={DETAIL_BUTTON}
      disabled={used || isPending}
      onClick={() =>
        run(() => deleteDiscountCodeAction(code.id), "Usunięto kod")
      }
      title={
        used
          ? "Kodu użyto przy wizytach: zamiast usuwać, wyłącz go."
          : undefined
      }
      type="button"
    >
      <Trash2 aria-hidden="true" />
    </button>
  );
}
