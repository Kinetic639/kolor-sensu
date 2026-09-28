"use client";

import type { SpecialistAvailabilityRule } from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { Copy, Layers, Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import {
  applyWeekTemplateAction,
  copyRuleToNextDayAction,
  setRuleToWorkdaysAction,
} from "./actions";
import { useAvailabilityEditor } from "./editor";

// Buttons of the availability page; each opens the shared editor or runs
// an action through it.

export function AddRuleButton({
  label = "Dodaj blok ręcznie",
  validFrom,
}: {
  label?: string;
  validFrom?: string;
}) {
  const editor = useAvailabilityEditor();
  return (
    <Button
      onClick={() =>
        editor.openRule(null, validFrom ? { prefill: { validFrom } } : {})
      }
      size="sm"
    >
      <Plus aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
}

export function WeekTemplateButton({
  validFrom,
  roomId,
}: {
  validFrom: string;
  roomId: string | null;
}) {
  const editor = useAvailabilityEditor();
  return (
    <Button
      disabled={editor.pending}
      onClick={() =>
        editor.run(
          () => applyWeekTemplateAction({ validFrom, roomId }),
          "Dodano regułę: pn–pt, 9:00–17:00, co tydzień",
        )
      }
      size="sm"
      title="Wypełnij tydzień pracy: poniedziałek–piątek 9:00–17:00, co tydzień"
      variant="secondary"
    >
      <Layers aria-hidden="true" className="size-4" />
      Szablon Pn–Pt (9–17)
    </Button>
  );
}

export function RuleCardActions({
  rule,
  label,
  canCopyToWorkdays,
}: {
  rule: SpecialistAvailabilityRule;
  label: string;
  canCopyToWorkdays: boolean;
}) {
  const editor = useAvailabilityEditor();
  return (
    <>
      {canCopyToWorkdays ? (
        <Button
          disabled={editor.pending}
          onClick={() =>
            editor.run(
              () => setRuleToWorkdaysAction(rule.id),
              "Reguła obejmuje teraz dni robocze (pn–pt)",
            )
          }
          size="sm"
          title="Ustaw tę regułę na wszystkie dni robocze (pn–pt)"
          variant="secondary"
        >
          <RotateCw aria-hidden="true" className="size-3.5" />
          Na cały tydzień
        </Button>
      ) : null}
      <Button
        aria-label={`Skopiuj na kolejny dzień: ${label}`}
        disabled={editor.pending}
        onClick={() =>
          editor.run(
            () => copyRuleToNextDayAction(rule.id),
            "Skopiowano blok na kolejny dzień",
          )
        }
        size="icon"
        title="Skopiuj na kolejny dzień"
        variant="secondary"
      >
        <Copy aria-hidden="true" className="size-4" />
      </Button>
      <Button
        onClick={() => editor.openRule(rule)}
        size="sm"
        variant="secondary"
      >
        <Pencil aria-hidden="true" className="size-3.5" />
        Edytuj regułę
      </Button>
      <Button
        aria-label={`Usuń regułę: ${label}`}
        onClick={() => editor.confirmDeleteRule(rule, label)}
        size="icon"
        title="Usuń regułę"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>
    </>
  );
}

export function AddTimeOffButton() {
  const editor = useAvailabilityEditor();
  return (
    <Button onClick={editor.openTimeOff} size="sm" variant="secondary">
      <Plus aria-hidden="true" className="size-4" />
      Dodaj nieobecność
    </Button>
  );
}

export function DeleteTimeOffButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const editor = useAvailabilityEditor();
  return (
    <Button
      aria-label={`Usuń nieobecność: ${label}`}
      onClick={() => editor.confirmDeleteTimeOff(id, label)}
      size="icon"
      variant="ghost"
    >
      <Trash2 aria-hidden="true" className="size-4" />
    </Button>
  );
}
