import type { Database } from "@repo/contracts/database";
import type {
  DiscountCode,
  DiscountCodeInput,
  DiscountKind,
} from "@repo/contracts/discount-codes";
import type { SupabaseClient } from "@supabase/supabase-js";

// Discount codes (docs/product/vouchers-plan.md, migration
// 20261022100000_discount_codes.sql). The admin manages them through the
// database's functions, which check the role; the site's server (the
// service-role client) applies one to a held visit, takes it off, reads it
// back and confirms a visit it made free. A refusal keeps the database's
// hint (code_unknown, code_not_started, code_expired): DISCOUNT_PROBLEMS
// in @repo/contracts/discount-codes says it in Polish.

type Client = SupabaseClient<Database>;

// ------------------------------------------------------------ the admin

export async function listDiscountCodes(
  client: Client,
): Promise<DiscountCode[]> {
  const { data, error } = await client.rpc("list_discount_codes");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    kind: row.kind as DiscountKind,
    value: row.value,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    active: row.active,
    note: row.note,
    createdAt: row.created_at,
    usedCount: Number(row.used_count),
    discountTotalMinor: Number(row.discount_total_minor),
  }));
}

/** Adds a code (id null) or changes one; its id. */
export async function saveDiscountCode(
  client: Client,
  id: string | null,
  input: DiscountCodeInput,
): Promise<string> {
  const { data, error } = await client.rpc("save_discount_code", {
    p_id: id,
    p_code: input.code,
    p_kind: input.kind,
    p_value: input.value,
    p_starts_on: input.startsOn,
    p_ends_on: input.endsOn,
    p_active: input.active,
    p_note: input.note,
  });
  if (error) throw error;
  return data;
}

/** Deletes a code no visit used (else `discount_code_used`). */
export async function deleteDiscountCode(client: Client, id: string) {
  const { error } = await client.rpc("delete_discount_code", { p_id: id });
  if (error) throw error;
}

// ------------------------------------------------------------ the booking

export interface BookingDiscount {
  code: string;
  listPriceMinor: number;
  discountMinor: number;
}

/** The hint of a refused code, if that is what the error is. */
export function discountRefusal(error: unknown): string | null {
  const hint =
    typeof error === "object" && error && "hint" in error
      ? String((error as { hint: unknown }).hint)
      : "";
  return [
    "code_unknown",
    "code_not_started",
    "code_expired",
    "hold_expired",
  ].includes(hint)
    ? hint
    : null;
}

/** Applies a code to a held visit (service role); its new price. */
export async function applyDiscountCode(
  secretClient: Client,
  accessToken: string,
  code: string,
): Promise<BookingDiscount & { priceMinor: number }> {
  const { data, error } = await secretClient.rpc("apply_discount_code", {
    p_access_token: accessToken,
    p_code: code,
  });
  if (error) throw error;
  const row = data![0]!;
  return {
    code: row.code,
    listPriceMinor: row.list_price_minor,
    discountMinor: row.discount_minor,
    priceMinor: row.price_minor,
  };
}

export async function removeDiscountCode(
  secretClient: Client,
  accessToken: string,
) {
  const { error } = await secretClient.rpc("remove_discount_code", {
    p_access_token: accessToken,
  });
  if (error) throw error;
}

/** A booking's code, if it has one. */
export async function getBookingDiscount(
  secretClient: Client,
  accessToken: string,
): Promise<BookingDiscount | null> {
  const { data, error } = await secretClient.rpc("get_booking_discount", {
    p_access_token: accessToken,
  });
  if (error) throw error;
  const row = data?.[0];
  return row
    ? {
        code: row.code,
        listPriceMinor: row.list_price_minor,
        discountMinor: row.discount_minor,
      }
    : null;
}

/** Confirms a held visit its code made free (no payment). */
export async function confirmFreeBooking(
  secretClient: Client,
  accessToken: string,
) {
  const { error } = await secretClient.rpc("confirm_free_booking", {
    p_access_token: accessToken,
  });
  if (error) throw error;
}
