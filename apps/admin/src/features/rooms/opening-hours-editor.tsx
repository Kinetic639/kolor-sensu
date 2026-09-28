"use client";

import type { RoomOpeningHoursIntervalInput } from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { SectionHeader } from "@repo/ui/portal-content";
import { WeeklyHoursEditor } from "@repo/ui/weekly-hours";
import { Copy, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
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
}: {
  roomId: string;
  hours: RoomOpeningHoursIntervalInput[];
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
    <Card>
      <SectionHeader
        description="W tych godzinach specjaliści mogą ustawiać dostępność w tym gabinecie. Poza nimi system nie pozwoli zapisać dyżuru."
        title="Tydzień gabinetu"
      />
      <form
        className="mt-5 grid gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <WeeklyHoursEditor
          dayActions={(weekday) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Kopiuj godziny z: ${DAY_NAMES[weekday - 1]}`}
                  disabled={isPending}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Copy aria-hidden="true" className="size-4" />
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
          <p className="flex items-start gap-2 rounded-[var(--radius-control)] bg-[var(--info-soft)] p-3 text-sm text-[var(--text)]">
            <Info
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-[var(--info)]"
            />
            Bez godzin otwarcia gabinet nie ogranicza dostępności specjalistów.
            Aby go wyłączyć z użytku, oznacz go jako nieaktywny w Ustawieniach.
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            disabled={!dirty || isPending}
            onClick={() => {
              setValues(initial);
              setSubmitted(false);
            }}
            type="button"
            variant="ghost"
          >
            Cofnij zmiany
          </Button>
          <Button disabled={!dirty} loading={isPending} type="submit">
            Zapisz godziny
          </Button>
        </div>
      </form>
    </Card>
  );
}
