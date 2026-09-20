"use client";

import {
  roomOpeningHoursIntervalSchema,
  type RoomOpeningHoursIntervalInput,
} from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const days = [
  [1, "Poniedziałek"],
  [2, "Wtorek"],
  [3, "Środa"],
  [4, "Czwartek"],
  [5, "Piątek"],
  [6, "Sobota"],
  [7, "Niedziela"],
] as const;

export function WeeklyOpeningHoursEditor({
  initialIntervals,
  pending,
  error,
  onSave,
}: {
  initialIntervals: RoomOpeningHoursIntervalInput[];
  pending?: boolean;
  error?: string | null;
  onSave: (intervals: RoomOpeningHoursIntervalInput[]) => void;
}) {
  const [intervals, setIntervals] = useState(initialIntervals);
  const [validationError, setValidationError] = useState<string | null>(null);
  const update = (index: number, key: "startsAt" | "endsAt", value: string) =>
    setIntervals((current) =>
      current.map((interval, currentIndex) =>
        currentIndex === index ? { ...interval, [key]: value } : interval,
      ),
    );
  const save = () => {
    const parsed = roomOpeningHoursIntervalSchema.array().safeParse(intervals);
    if (!parsed.success)
      return setValidationError(
        "Sprawdź godziny. Początek musi być wcześniejszy niż koniec.",
      );
    setValidationError(null);
    onSave(parsed.data);
  };
  return (
    <div className="space-y-4">
      {days.map(([weekday, label]) => {
        const dayIntervals = intervals
          .map((interval, index) => ({ interval, index }))
          .filter(({ interval }) => interval.weekday === weekday);
        return (
          <section
            className="grid gap-3 border-b border-[var(--border)] py-4 last:border-0 sm:grid-cols-[9rem_1fr]"
            key={weekday}
          >
            <div>
              <strong className="text-sm">{label}</strong>
              <p className="text-xs text-[var(--text-muted)]">
                {dayIntervals.length
                  ? `${dayIntervals.length} przedział(y)`
                  : "Zamknięte"}
              </p>
            </div>
            <div className="space-y-2">
              {dayIntervals.map(({ interval, index }) => (
                <div
                  className="flex items-center gap-2"
                  key={`${weekday}-${index}`}
                >
                  <Input
                    aria-label={`${label} od`}
                    type="time"
                    value={interval.startsAt}
                    onChange={(event) =>
                      update(index, "startsAt", event.target.value)
                    }
                  />
                  <span>–</span>
                  <Input
                    aria-label={`${label} do`}
                    type="time"
                    value={interval.endsAt}
                    onChange={(event) =>
                      update(index, "endsAt", event.target.value)
                    }
                  />
                  <Button
                    aria-label={`Usuń przedział ${label}`}
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setIntervals((current) =>
                        current.filter(
                          (_, currentIndex) => currentIndex !== index,
                        ),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onClick={() =>
                  setIntervals((current) => [
                    ...current,
                    { weekday, startsAt: "08:00", endsAt: "18:00" },
                  ])
                }
              >
                <Plus className="size-4" />
                Dodaj przedział
              </Button>
            </div>
          </section>
        );
      })}
      <p className="text-sm text-[var(--text-muted)]">
        Zmiana zapisuje cały tydzień atomowo. Nakładające się przedziały są
        odrzucane przez bazę.
      </p>
      {validationError || error ? (
        <p className="text-sm text-[var(--danger)]">
          {validationError ?? error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button loading={pending} onClick={save}>
          Zapisz godziny
        </Button>
      </div>
    </div>
  );
}
