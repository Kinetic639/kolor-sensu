import { DiscountCodeManager } from "@/features/discount-codes/code-manager";
import { createClient } from "@/lib/supabase/server";
import { listDiscountCodes } from "@repo/supabase/discount-codes";
import { listWorkshopsForCodes } from "@repo/supabase/workshops";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";

// Kody rabatowe (docs/product/vouchers-plan.md): every code, with whether
// it works today in the centre's time zone, and the workshops a code may
// be for.

export default async function DiscountCodesPage() {
  const client = await createClient();
  const [codes, workshops] = await Promise.all([
    listDiscountCodes(client),
    listWorkshopsForCodes(client),
  ]);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
  }).format(new Date());

  return (
    <FullBleed>
      <PageTitle>Kody rabatowe</PageTitle>
      <DiscountCodeManager codes={codes} today={today} workshops={workshops} />
    </FullBleed>
  );
}
