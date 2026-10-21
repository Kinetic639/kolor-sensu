import { DiscountCodeManager } from "@/features/discount-codes/code-manager";
import { createClient } from "@/lib/supabase/server";
import { listDiscountCodes } from "@repo/supabase/discount-codes";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";

// Kody rabatowe (docs/product/vouchers-plan.md): every code, with whether
// it works today in the centre's time zone.

export default async function DiscountCodesPage() {
  const codes = await listDiscountCodes(await createClient());
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
  }).format(new Date());

  return (
    <FullBleed>
      <PageTitle>Kody rabatowe</PageTitle>
      <DiscountCodeManager codes={codes} today={today} />
    </FullBleed>
  );
}
