import type { BookingWindow } from "@repo/supabase";

// Kontakt's answer on cancelling or moving a visit (#119): the centre's
// settings (Ustawienia → Rezerwacje online), as booking applies them and as
// Cennik says them, never a number written into the CMS.

export function cancellingAnswer(
  window: Pick<
    BookingWindow,
    "cancellationWindowHours" | "rescheduleWindowHours" | "maxSelfReschedules"
  >,
) {
  const cancel = `Wizytę odwołasz z pełnym zwrotem opłaty najpóźniej ${window.cancellationWindowHours} godz. przed jej początkiem`;
  const move =
    window.maxSelfReschedules > 0
      ? `, a termin zmienisz najpóźniej ${window.rescheduleWindowHours} godz. przed nią`
      : "";
  return {
    question: "Jak mogę odwołać lub przełożyć wizytę?",
    answer: `${cancel}${move}: na stronie wizyty (link jest w e-mailu z potwierdzeniem), telefonicznie albo mailowo.`,
  };
}
