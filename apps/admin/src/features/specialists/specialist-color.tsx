"use client";

import { Button } from "@repo/ui/button";
import { ColorField } from "@repo/ui/color-field";
import { toast } from "@repo/ui/toast";
import { useState, useTransition } from "react";
import { setSpecialistColorAction } from "./actions";

// Ustawienia → Kolor: the specialist's colour in schedules and lists, the
// palette or a code of one's own, or the automatic one; saved with the
// section's button.

export function SpecialistColorForm({
  specialistId,
  color: saved,
  automaticColor,
}: {
  specialistId: string;
  /** Set by an admin; null: automatic. */
  color: string | null;
  automaticColor: string;
}) {
  const [color, setColor] = useState(saved);
  const [pending, startTransition] = useTransition();
  const dirty = color !== saved;

  return (
    <form
      className="grid gap-4 px-3.5 py-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await setSpecialistColorAction({
            specialistId,
            color,
          });
          if (result.ok) toast.success("Zapisano kolor");
          else
            toast.error("Nie udało się zapisać koloru", {
              description: result.message,
            });
        });
      }}
    >
      <ColorField
        automaticColor={automaticColor}
        disabled={pending}
        label="Kolor specjalisty"
        onChange={setColor}
        value={color}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={!dirty || pending}
          onClick={() => setColor(saved)}
          size="sm"
          type="button"
          variant="ghost"
        >
          Cofnij zmiany
        </Button>
        <Button disabled={!dirty} loading={pending} size="sm" type="submit">
          Zapisz kolor
        </Button>
      </div>
    </form>
  );
}
