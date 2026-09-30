"use server";

import { toFreeSlots } from "@repo/scheduling";
import { listRescheduleSlots, type BookingErrorCode } from "@repo/supabase";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createSecretClient } from "@/lib/supabase/secret";
import { cancelVisit, rescheduleVisit } from "./change-visit";
import { changeVisitDeps } from "./change-visit-server";
import { visitByLinkToken } from "./guest-visit";
import { loadRescheduleParams } from "./reschedule-view";

// The client changing a visit from its e-mail link (docs/product/booking-
// plan.md, R8). Plain forms posted to the server: the link's token and, to
// move it, the chosen local time. The instant is found again among the free
// times; the database checks the centre's rules once more.

export type ChangeFormState =
  { status: "idle" } | { status: "error"; message: string };

const CONTACT = "Skontaktuj się z nami, a pomożemy.";

const MESSAGES: Partial<Record<BookingErrorCode, string>> = {
  slot_unavailable:
    "Ten termin właśnie przestał być wolny. Wybierz, proszę, inny.",
  not_reschedulable: `Tej wizyty nie można już przełożyć samodzielnie. ${CONTACT}`,
  not_cancellable: `Tej wizyty nie można już odwołać przez stronę. ${CONTACT}`,
  not_found: "Nie znaleźliśmy tej wizyty. Sprawdź link z e-maila.",
};

function failed(code: BookingErrorCode): ChangeFormState {
  return {
    status: "error",
    message:
      MESSAGES[code] ??
      `Nie udało się zapisać zmiany. Spróbuj ponownie za chwilę. ${CONTACT}`,
  };
}

function visitPath(token: string, change: "odwolana" | "przelozona") {
  return `/wizyta/${token}?zmiana=${change}` as Route;
}

export async function cancelVisitAction(
  _previous: ChangeFormState,
  form: FormData,
): Promise<ChangeFormState> {
  const token = String(form.get("token") ?? "");
  const visit = await visitByLinkToken(token);
  if (!visit) return failed("not_found");

  const result = await cancelVisit(
    token,
    visit.booking.rescheduleCount + 1,
    changeVisitDeps(),
  );
  if (!result.ok) return failed(result.code);
  redirect(visitPath(token, "odwolana"));
}

export async function rescheduleVisitAction(
  _previous: ChangeFormState,
  form: FormData,
): Promise<ChangeFormState> {
  const token = String(form.get("token") ?? "");
  const { termin } = loadRescheduleParams({
    termin: String(form.get("termin") ?? ""),
  });
  const visit = await visitByLinkToken(token);
  if (!visit) return failed("not_found");
  if (!termin) return failed("slot_unavailable");

  const day = termin.slice(0, 10);
  const rows = await listRescheduleSlots(createSecretClient(), token, {
    from: day,
    to: day,
  }).catch((error) => {
    console.error("[booking] times to move to failed:", error);
    return [];
  });
  const slot = toFreeSlots(rows, visit.timeZone).find(
    (one) => `${one.date}T${one.localTime}` === termin,
  );
  if (!slot) return failed("slot_unavailable");

  const result = await rescheduleVisit(
    token,
    slot.start.toISOString(),
    changeVisitDeps(),
  );
  if (!result.ok) return failed(result.code);
  redirect(visitPath(token, "przelozona"));
}
