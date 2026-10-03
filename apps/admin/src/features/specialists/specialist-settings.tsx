"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { ColorField } from "@repo/ui/color-field";
import { SectionHeader } from "@repo/ui/portal-content";
import { useState } from "react";
import { toast } from "@repo/ui/toast";
import { setSpecialistColorAction } from "./actions";
import { specialistsKeys } from "./query-keys";
import type { SpecialistDetailViewModel } from "./types";

/** Specjaliści → Ustawienia: the specialist's colour in schedules and lists. */
export function SpecialistSettings({
  detail,
}: {
  detail: SpecialistDetailViewModel;
}) {
  const queryClient = useQueryClient();
  const [color, setColor] = useState(detail.color);
  const mutation = useMutation({
    mutationFn: async (value: string | null) => {
      const result = await setSpecialistColorAction({
        specialistId: detail.id,
        color: value,
      });
      if (!result.ok) throw new Error(result.message);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: specialistsKeys.detail(detail.id),
          exact: true,
        }),
        queryClient.invalidateQueries({ queryKey: specialistsKeys.lists() }),
      ]);
      toast.success("Zapisano kolor");
    },
    onError: (error) => toast.error(error.message),
  });
  const dirty = color !== detail.color;

  return (
    <Card className="max-w-3xl">
      <SectionHeader
        description="Wyróżnia specjalistę w grafikach gabinetów i na listach."
        title="Kolor"
      />
      <form
        className="mt-5 grid gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(color);
        }}
      >
        <ColorField
          automaticColor={detail.automaticAccent}
          disabled={mutation.isPending}
          label="Kolor specjalisty"
          onChange={setColor}
          value={color}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            disabled={!dirty || mutation.isPending}
            onClick={() => setColor(detail.color)}
            type="button"
            variant="ghost"
          >
            Cofnij zmiany
          </Button>
          <Button disabled={!dirty} loading={mutation.isPending} type="submit">
            Zapisz kolor
          </Button>
        </div>
      </form>
    </Card>
  );
}
