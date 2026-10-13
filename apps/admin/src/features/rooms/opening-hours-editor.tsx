"use client";

import type { RoomOpeningHoursIntervalInput } from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { DetailSection } from "@repo/ui/detail-page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { WeeklyHoursEditor } from "@repo/ui/weekly-hours";
import { Copy, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "@repo/ui/toast";
import { saveOpeningHoursAction } from "./actions";
import {
  copyDayTo,
  openingHoursFormSchema,
  toOpeningHoursFormValues,
  type OpeningHoursFormValues,
} from "./opening-hours-form";

const DAY_NAMES = [
  "poniedziałek",
  "wtorek",
  "środę",
  "czwartek",
  "piątek",
  "sobotę",
  "niedzielę",
];
const WORKDAYS = [1, 2, 3, 4, 5];
const WEEK = [1, 2, 3, 4, 5, 6, 7];

/** Messages keyed `dayIndex.intervalIndex`, as the editor shows them. */
function errorsOf(values: OpeningHoursFormValues) {
  const result = openingHoursFormSchema.safeParse(values);
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    const [, day, , interval] = issue.path;
    const key = `${String(day)}.${String(interval ?? 0)}`;
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Gabinety → Godziny otwarcia: the room's week. */
export function OpeningHoursEditor({
  roomId,
  hours,
  step,
}: {
  roomId: string;
  hours: RoomOpeningHoursIntervalInput[];
  /** The centre's grid: opening hours lie on it (minutes). */
  step: number;
}) {
  const router = useRouter();
  const initial = useMemo(() => toOpeningHoursFormValues(hours), [hours]);
  const [values, setValues] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const errors = submitted ? errorsOf(values) : {};
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const allClosed = values.days.every((day) => !day.open);

  function save() {
    setSubmitted(true);
    if (Object.keys(errorsOf(values)).length) return;
    startTransition(async () => {
      const result = await saveOpeningHoursAction(roomId, values);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Zapisano godziny otwarcia");
      setSubmitted(false);
      router.refresh();
    });
  }

  return (
    <DetailSection
      note="W tych godzinach specjaliści ustawiają dyżury w tym gabinecie."
      title="Godziny otwarcia"
    >
      <form
        className="grid gap-3 pb-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <WeeklyHoursEditor
          step={step}
          dayActions={(weekday) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Kopiuj godziny z: ${DAY_NAMES[weekday - 1]}`}
                  className="size-[26px] rounded-[5px] text-[var(--text-muted)]"
                  disabled={isPending}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Copy aria-hidden="true" className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() =>
                    setValues({
                      days: copyDayTo(values.days, weekday, WORKDAYS),
                    })
                  }
                >
                  Kopiuj na dni robocze (pn–pt)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    setValues({ days: copyDayTo(values.days, weekday, WEEK) })
                  }
                >
                  Kopiuj na cały tydzień
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          disabled={isPending}
          errors={errors}
          onChange={(days) => setValues({ days })}
          value={values.days}
        />
        {allClosed ? (
          <p className="mx-3.5 flex items-start gap-2 rounded-[var(--radius-control)] bg-[var(--info-soft)] p-3 text-[0.8125rem] text-[var(--text)]">
            <Info
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-[var(--info)]"
            />
            Bez godzin otwarcia gabinet jest zamknięty: specjaliści nie ustawią
            w nim dyżurów, a centrum nie zapisze w nim wizyt. Otwórz go
            przynajmniej jednego dnia.
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 px-3.5">
          <Button
            disabled={!dirty || isPending}
            onClick={() => {
              setValues(initial);
              setSubmitted(false);
            }}
            className="h-7 px-2.5 text-[0.8125rem]"
            size="sm"
            type="button"
            variant="ghost"
          >
            Cofnij zmiany
          </Button>
          <Button
            disabled={!dirty}
            className="h-7 px-2.5 text-[0.8125rem]"
            loading={isPending}
            size="sm"
            type="submit"
          >
            Zapisz godziny
          </Button>
        </div>
      </form>
    </DetailSection>
  );
}
