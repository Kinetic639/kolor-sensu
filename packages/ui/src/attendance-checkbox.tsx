"use client";

import { useEffect, useState } from "react";

// Whether a workshop's participant came: the click shows at once, while
// the portal saves it; a failed save puts it back. `onSave` answers whether
// it was saved (and says why not itself, e.g. with a toast).

export function AttendanceCheckbox({
  attended,
  name,
  onSave,
}: {
  attended: boolean;
  /** The participant, for the box's name: "Ola Nowak: był(a)". */
  name: string;
  onSave: (attended: boolean) => Promise<boolean>;
}) {
  const [checked, setChecked] = useState(attended);
  const [saving, setSaving] = useState(false);
  useEffect(() => setChecked(attended), [attended]);

  return (
    <label className="flex items-center gap-1.5 text-[0.8125rem]">
      <input
        aria-busy={saving || undefined}
        aria-label={`${name}: był(a)`}
        checked={checked}
        className="size-4 accent-[var(--primary)]"
        disabled={saving}
        onChange={async (event) => {
          const next = event.target.checked;
          setChecked(next);
          setSaving(true);
          const saved = await onSave(next);
          setSaving(false);
          if (!saved) setChecked(!next);
        }}
        type="checkbox"
      />
      Był(a)
    </label>
  );
}
