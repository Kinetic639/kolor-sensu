"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  localDateSchema,
  timeOffInputSchema,
  type AvailabilityRuleInput,
  type TimeOffInput,
} from "@repo/contracts";
import { DEFAULT_TIME_ZONE, localSpanToInterval } from "@repo/scheduling";
import {
  AvailabilityError,
  addTimeOff,
  deleteAvailabilityOccurrence,
  deleteAvailabilityRule,
  editAvailabilityOccurrence,
  deleteTimeOff,
  saveAvailabilityRule,
  type AvailabilityErrorReason,
  type OccurrenceTarget,
} from "@repo/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findMyAvailabilityRule } from "./loaders";
import { nextDayCopy, weekTemplate, withWorkdays } from "./rule-copies";

type ActionResult = { ok: true } | { ok: false; message: string };

const MESSAGES: Record<AvailabilityErrorReason, string> = {
  overlap: "Te godziny nakładają się na inne Twoje godziny dostępności.",
  room_taken:
    "Ten gabinet jest w tym czasie zajęty przez innego specjalistę. Wybierz inny gabinet albo inne godziny.",
  room_unavailable: "Ten gabinet nie jest już dostępny. Wybierz inny.",
  time_off_overlap: "Ta nieobecność nakłada się na inną, już zapisaną.",
  not_found: "Nie znaleziono tych godzin. Odśwież stronę.",
  forbidden: "Brak uprawnień do zmiany tego grafiku.",
};

function failure(error: unknown): ActionResult {
  if (error instanceof AvailabilityError) {
    return { ok: false, message: MESSAGES[error.reason] };
  }
  if (error instanceof Error && error.name === "ZodError") {
    return { ok: false, message: "Sprawdź poprawność danych." };
  }
  return { ok: false, message: "Nie udało się zapisać. Spróbuj ponownie." };
}

async function run(change: () => Promise<unknown>): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await change();
    revalidatePath("/dostepnosc");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Adds a window, or edits the one with `id`. */
export async function saveAvailabilityRuleAction(
  input: AvailabilityRuleInput,
  id?: string,
) {
  return run(async () =>
    saveAvailabilityRule(await createClient(), input, id ? { id } : {}),
  );
}

export async function deleteAvailabilityRuleAction(id: string) {
  return run(async () => deleteAvailabilityRule(await createClient(), id));
}

export async function addTimeOffAction(input: TimeOffInput) {
  return run(async () => {
    const value = timeOffInputSchema.parse(input);
    const interval = localSpanToInterval(value, DEFAULT_TIME_ZONE);
    await addTimeOff(await createClient(), {
      ...interval,
      reason: value.reason,
    });
  });
}

export async function deleteTimeOffAction(id: string) {
  return run(async () => deleteTimeOff(await createClient(), id));
}

/** A change to one occurrence of a rule, this and the following, or all. */
export async function editAvailabilityOccurrenceAction(
  target: OccurrenceTarget,
  input: AvailabilityRuleInput,
) {
  return run(async () =>
    editAvailabilityOccurrence(await createClient(), target, input),
  );
}

/** Removes one occurrence of a rule, this and the following, or all. */
export async function deleteAvailabilityOccurrenceAction(
  target: OccurrenceTarget,
) {
  return run(async () =>
    deleteAvailabilityOccurrence(await createClient(), target),
  );
}

/** "Skopiuj na kolejny dzień": the same hours a day later, as a new window. */
export async function copyRuleToNextDayAction(id: string) {
  const rule = await findMyAvailabilityRule(id);
  if (!rule) return failure(new AvailabilityError("not_found"));
  return run(async () =>
    saveAvailabilityRule(await createClient(), nextDayCopy(rule)),
  );
}

/** "Na cały tydzień": the rule on every working day. */
export async function setRuleToWorkdaysAction(id: string) {
  const rule = await findMyAvailabilityRule(id);
  if (!rule) return failure(new AvailabilityError("not_found"));
  return run(async () =>
    saveAvailabilityRule(await createClient(), withWorkdays(rule), { id }),
  );
}

const templateSchema = z.object({
  validFrom: localDateSchema,
  roomId: z.uuid().nullable(),
});

/** "Szablon Pn–Pt (9–17)": one rule, every working day from `validFrom`. */
export async function applyWeekTemplateAction(input: {
  validFrom: string;
  roomId: string | null;
}) {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Sprawdź poprawność danych." } as const;
  }
  return run(async () =>
    saveAvailabilityRule(await createClient(), weekTemplate(parsed.data)),
  );
}
