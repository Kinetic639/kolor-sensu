"use client";

import { toast } from "@repo/ui/toast";
import { useTransition } from "react";
import { setAttendanceAction } from "./actions";

// Whether a participant came: a checkbox, saved at once.

export function AttendanceBox({
  registrationId,
  attended,
  name,
}: {
  registrationId: string;
  attended: boolean;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-1.5 text-[0.8125rem]">
      <input
        aria-label={`${name}: był(a)`}
        checked={attended}
        className="size-4 accent-[var(--primary)]"
        disabled={pending}
        onChange={(event) => {
          const next = event.target.checked;
          startTransition(async () => {
            const result = await setAttendanceAction(registrationId, next);
            if (!result.ok) toast.error("Nie udało się zapisać obecności.");
          });
        }}
        type="checkbox"
      />
      Był(a)
    </label>
  );
}
