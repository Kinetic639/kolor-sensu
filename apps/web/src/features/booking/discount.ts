import { DISCOUNT_PROBLEMS, formatMinor } from "@repo/contracts/discount-codes";
import type { BookingDiscount } from "@repo/supabase/discount-codes";

// A discount code on a booking (docs/product/vouchers-plan.md, PR 2): how
// the summary says the price, and what the guest reads when a code is
// refused. Pure, tested without a database.

/** The price as the summary says it: after the code, if there is one. */
export function priceWithDiscount(
  priceMinor: number,
  discount: BookingDiscount | null,
): string {
  if (!discount) return formatMinor(priceMinor);
  if (priceMinor === 0)
    return `0,00 zł (kod ${discount.code} pokrywa ${formatMinor(discount.listPriceMinor)})`;
  return `${formatMinor(priceMinor)} (zamiast ${formatMinor(discount.listPriceMinor)}, kod ${discount.code})`;
}

/** A refused code, said to the guest. */
export function discountProblem(hint: string | null): string {
  return (
    (hint && DISCOUNT_PROBLEMS[hint]) ??
    "Nie udało się sprawdzić kodu. Spróbuj ponownie za chwilę."
  );
}
