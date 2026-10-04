"use server";

import {
  intakeAnswersSchema,
  intakeOutcome,
  type IntakeAnswers,
} from "@repo/contracts/intake";
import { saveVisitIntake } from "@repo/supabase/intakes";
import { redirect } from "next/navigation";
import { createSecretClient } from "@/lib/supabase/secret";
import { saveIntake } from "./intake-cookie";
import { bookingHref, loadBookingParams } from "./search-params";

// The questionnaire given (the booking wizard): kept in the database, its
// token in the visitor's cookie, and back to the wizard where it was left.
// A crisis is never kept for a booking (the page points to help instead).

export async function saveIntakeAction(
  query: string,
  answers: IntakeAnswers,
): Promise<{ message: string } | void> {
  const params = loadBookingParams(new URLSearchParams(query));
  const parsed = intakeAnswersSchema.safeParse(answers);
  if (!parsed.success) {
    return { message: "Sprawdź, proszę, odpowiedzi i spróbuj ponownie." };
  }
  if (intakeOutcome(parsed.data.mood) === "crisis") {
    return {
      message:
        "Teraz najważniejsza jest rozmowa z kimś od razu: zadzwoń pod jeden z numerów powyżej.",
    };
  }

  const db = createSecretClient();
  const { data: service, error } = await db
    .from("services")
    .select("id")
    .eq("slug", params.usluga ?? "")
    .eq("requires_intake", true)
    .maybeSingle();
  if (error) throw error;
  if (!service) redirect(bookingHref(params));

  let token: string;
  try {
    token = await saveVisitIntake(db, {
      serviceId: service.id,
      answers: parsed.data,
    });
  } catch (failure) {
    console.error("[booking] intake not saved:", failure);
    return { message: "Nie udało się zapisać odpowiedzi. Spróbuj ponownie." };
  }
  await saveIntake(params.usluga!, token);
  redirect(bookingHref(params));
}
