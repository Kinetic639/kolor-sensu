"use client";

import type { ServiceCatalog } from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { OfferArrangement, type ServiceRow } from "@repo/ui/services";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/sheet";
import { FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import { arrangeServicesAction } from "./actions";

// Oferta → "Kolejność i katalogi": the offer's arrangement (as the site's
// menu shows it) in a side panel over the list. Open in the address
// (`?uklad=1`), so a service's settings can link to it.

const OPEN = parseAsBoolean.withDefault(false).withOptions({
  history: "replace",
  scroll: false,
});

export function ArrangeOfferButton({
  rows,
  catalogs,
}: {
  /** Every service. */
  rows: ServiceRow[];
  catalogs: ServiceCatalog[];
}) {
  const router = useRouter();
  const [open, setOpen] = useQueryState("uklad", OPEN);
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    paint: row.paint,
    active: row.active,
    publiclyVisible: row.publiclyVisible,
    catalogId: row.catalog?.id ?? null,
    sortOrder: row.sortOrder,
  }));
  return (
    <Sheet onOpenChange={(next) => void setOpen(next || null)} open={open}>
      <SheetTrigger asChild>
        <Button className="h-8 px-2.5 text-[0.8125rem]" variant="secondary">
          <FolderOpen aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Kolejność i katalogi</span>
          <span className="sm:hidden">Układ</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        side="right"
      >
        <div className="border-b border-[var(--border)] px-4 py-3 pr-12">
          <SheetTitle className="text-[0.9375rem]">
            Kolejność i katalogi
          </SheetTitle>
          <SheetDescription className="text-[0.8125rem]">
            Menu „Oferta” na stronie i kolejność usług na stronie oferty.
          </SheetDescription>
        </div>
        {open ? (
          <OfferArrangement
            action={arrangeServicesAction}
            catalogs={catalogs}
            items={items}
            onDone={() => {
              void setOpen(null);
              router.refresh();
            }}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
