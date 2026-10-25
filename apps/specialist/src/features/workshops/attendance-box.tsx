"use client";

import { AttendanceCheckbox } from "@repo/ui/attendance-checkbox";
import { toast } from "@repo/ui/toast";
import { setAttendanceAction } from "./actions";

// Whether a participant came: a checkbox, shown at once and saved.

export function AttendanceBox({
  registrationId,
  attended,
  name,
}: {
  registrationId: string;
  attended: boolean;
  name: string;
}) {
  return (
    <AttendanceCheckbox
      attended={attended}
      name={name}
      onSave={async (next) => {
        const result = await setAttendanceAction(registrationId, next);
        if (!result.ok) toast.error("Nie udało się zapisać obecności.");
        return result.ok;
      }}
    />
  );
}
