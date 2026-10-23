"use client";

import { formatMinor } from "@repo/contracts/discount-codes";
import { BookingField } from "@repo/ui/booking/fields";
import { SecondaryButton } from "@repo/ui/public-site/actions";
import { useActionState } from "react";
import {
  applyDiscountAction,
  removeDiscountAction,
  type DiscountFormState,
} from "./actions";

// "Masz kod rabatowy?" on the details step (docs/product/vouchers-plan.md):
// a code applied at once, the summary showing the price after it; or the
// code in use with "Usuń kod". Its own form, beside the details form, so
// applying a code never sends (or loses) the client's details.

export function DiscountForm({
  applied,
}: {
  /** The code in use, with what it takes off; none: the field. */
  applied: { code: string; discountMinor: number } | null;
}) {
  const [state, action, pending] = useActionState<DiscountFormState, FormData>(
    applyDiscountAction,
    { status: "idle" },
  );

  if (applied) {
    return (
      <form
        action={removeDiscountAction}
        className="rounded-card-sm bg-primary-soft flex flex-wrap items-center justify-between gap-3 p-4"
      >
        <p className="text-small text-ink" role="status">
          Kod <strong>{applied.code}</strong>: rabat{" "}
          {formatMinor(applied.discountMinor)}.
        </p>
        <SecondaryButton size="sm" type="submit">
          Usuń kod
        </SecondaryButton>
      </form>
    );
  }

  return (
    <form action={action} className="grid gap-3" noValidate>
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <BookingField
          autoCapitalize="characters"
          autoComplete="off"
          defaultValue={state.status === "refused" ? state.code : undefined}
          error={state.status === "refused" ? state.message : undefined}
          label="Kod rabatowy (opcjonalnie)"
          maxLength={32}
          name="kod"
        />
        <SecondaryButton disabled={pending} type="submit">
          Zastosuj
        </SecondaryButton>
      </div>
    </form>
  );
}
