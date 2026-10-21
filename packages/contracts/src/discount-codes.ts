import { z } from "zod";

// Discount codes (docs/product/vouchers-plan.md): a percentage or an amount
// off a visit, from and until optional dates, switched on or off by the
// admin. The database checks the same rules again and computes the
// discount; this is what the portal's form and the site show.

export const DISCOUNT_KINDS = ["percent", "amount"] as const;
export type DiscountKind = (typeof DISCOUNT_KINDS)[number];

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę.")
  .nullable();

export const discountCodeInputSchema = z
  .strictObject({
    code: z
      .string()
      .trim()
      .transform((code) => code.toUpperCase())
      .pipe(
        z
          .string()
          .regex(
            /^[A-Z0-9][A-Z0-9_-]{2,31}$/,
            "Kod: 3–32 znaki, litery bez polskich znaków, cyfry, - lub _.",
          ),
      ),
    kind: z.enum(DISCOUNT_KINDS),
    /** Percent (1–100) or grosze. */
    value: z.number().int().positive(),
    startsOn: day,
    endsOn: day,
    active: z.boolean(),
    note: z.string().trim().max(300),
  })
  .refine((input) => input.kind === "amount" || input.value <= 100, {
    message: "Rabat procentowy: od 1 do 100 %.",
    path: ["value"],
  })
  .refine((input) => input.kind === "percent" || input.value <= 10_000_000, {
    message: "Za duża kwota.",
    path: ["value"],
  })
  .refine(
    (input) =>
      !input.startsOn || !input.endsOn || input.endsOn >= input.startsOn,
    { message: "Koniec nie może być przed początkiem.", path: ["endsOn"] },
  );

export type DiscountCodeInput = z.infer<typeof discountCodeInputSchema>;

export interface DiscountCode extends DiscountCodeInput {
  id: string;
  createdAt: string;
  /** Visits reserved or confirmed with it. */
  usedCount: number;
  /** What it took off confirmed visits, in grosze. */
  discountTotalMinor: number;
}

/** A code's discount on a price, in grosze: never more than the price. */
export function discountOn(
  kind: DiscountKind,
  value: number,
  priceMinor: number,
): number {
  const off =
    kind === "percent" ? Math.round((priceMinor * value) / 100) : value;
  return Math.min(priceMinor, off);
}

const PLN = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

/** `37,00 zł` (a plain space, as in the site's text). */
export const formatMinor = (minor: number) =>
  PLN.format(minor / 100).replace(/ /g, " ");

/** `−20 %` or `−50,00 zł`. */
export function discountLabel(
  code: Pick<DiscountCode, "kind" | "value">,
): string {
  return code.kind === "percent"
    ? `−${code.value} %`
    : `−${formatMinor(code.value)}`;
}

export type DiscountCodeState = "active" | "off" | "planned" | "ended";

export const DISCOUNT_STATE_LABELS: Record<DiscountCodeState, string> = {
  active: "Działa",
  off: "Wyłączony",
  planned: "Zaplanowany",
  ended: "Wygasł",
};

/** Whether a code works today (`today`: the centre's day, YYYY-MM-DD). */
export function discountCodeState(
  code: Pick<DiscountCode, "active" | "startsOn" | "endsOn">,
  today: string,
): DiscountCodeState {
  if (!code.active) return "off";
  if (code.endsOn && today > code.endsOn) return "ended";
  if (code.startsOn && today < code.startsOn) return "planned";
  return "active";
}

/** Złote as typed ("49,99", "50") in grosze; null if not a price. */
export function parseZloty(text: string): number | null {
  const match = /^\s*(\d{1,6})(?:[.,](\d{1,2}))?\s*(?:zł)?\s*$/.exec(text);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "0").padEnd(2, "0"));
}

/** The database's refusals of a code, as the guest reads them. */
export const DISCOUNT_PROBLEMS: Record<string, string> = {
  code_unknown: "Nie ma takiego kodu albo jest już nieaktywny.",
  code_not_started: "Ten kod jeszcze nie działa.",
  code_expired: "Ten kod już wygasł.",
  discount_code_used:
    "Tego kodu użyto już przy wizytach: zamiast usuwać, wyłącz go.",
};
