import { formatMinor } from "@repo/contracts/discount-codes";
import type { BookingDiscount } from "@repo/supabase/discount-codes";

/** A visit's code as its panel says it: `JESIEN20: −40,00 zł (cena 200,00 zł)`. */
export function discountLabelOf(
  discount: BookingDiscount | null,
): string | null {
  return discount
    ? `${discount.code}: −${formatMinor(discount.discountMinor)} (cena ${formatMinor(discount.listPriceMinor)})`
    : null;
}
