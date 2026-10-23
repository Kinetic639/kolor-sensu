"use client";

import { isNaffyProductUrl } from "@repo/app-runtime/naffy-price";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { useState, useTransition } from "react";
import { checkNaffyPriceAction, type NaffyPriceCheck } from "./actions";

// An e-book's price on the site (#150): the admin shows it, read from the
// product's page on Naffy (a promotion as Naffy shows it), or only the way
// to Naffy. "Sprawdź cenę" reads it now, to see what visitors will see.

export function NaffyPriceChoice({
  naffyUrl,
  showPrice,
  onChange,
}: {
  naffyUrl: string;
  showPrice: boolean;
  onChange: (showPrice: boolean) => void;
}) {
  const [check, setCheck] = useState<NaffyPriceCheck | null>(null);
  const [checking, startCheck] = useTransition();
  const product = isNaffyProductUrl(naffyUrl);

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium text-[var(--text)]">
        Cena na stronie
      </legend>
      <label className="flex items-start gap-2 text-sm">
        <input
          checked={!showPrice}
          className="mt-0.5 size-4 accent-[var(--primary)]"
          name="ebook-price"
          onChange={() => onChange(false)}
          type="radio"
        />
        Tylko przycisk „Zobacz cenę i kup na Naffy”
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          checked={showPrice}
          className="mt-0.5 size-4 accent-[var(--primary)]"
          name="ebook-price"
          onChange={() => onChange(true)}
          type="radio"
        />
        <span>
          Cena z Naffy i przycisk „Kup na Naffy”
          <span className="block text-xs text-[var(--text-muted)]">
            Odczytywana ze strony produktu co godzinę. Przecenę pokazujemy jak
            Naffy: starą cenę przekreśloną i najniższą cenę z 30 dni przed
            obniżką. Gdy ceny nie da się odczytać, zostaje „Zobacz cenę i kup na
            Naffy”.
          </span>
        </span>
      </label>
      {showPrice ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            className={DETAIL_BUTTON}
            disabled={!product || checking}
            onClick={() =>
              startCheck(async () =>
                setCheck(await checkNaffyPriceAction(naffyUrl)),
              )
            }
            type="button"
          >
            {checking ? "Sprawdzam…" : "Sprawdź cenę"}
          </button>
          <span aria-live="polite" className="text-[var(--text-muted)]">
            {!product
              ? "Wpisz adres produktu na Naffy (np. https://www.naffy.io/sklep/produkt)."
              : check?.ok
                ? [
                    check.regular
                      ? `${check.current} zamiast ${check.regular}`
                      : check.current,
                    check.lowest,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : check
                  ? "Nie udało się odczytać ceny: na stronie zostanie „Zobacz cenę i kup na Naffy”."
                  : null}
          </span>
        </div>
      ) : null}
    </fieldset>
  );
}
