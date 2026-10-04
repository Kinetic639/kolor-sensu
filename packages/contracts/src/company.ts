import { z } from "zod";

// The centre's company (Ustawienia → Centrum): its legal name, NIP, REGON
// and registered address, as the law wants them on the site (the footer)
// and on what the centre sends. Kept as digits; checked by their check
// digits, so a typo is caught before it is printed everywhere.

const digits = (value: string) => value.replace(/[\s-]/g, "");

function checkDigit(value: string, weights: readonly number[]) {
  const sum = weights.reduce(
    (total, weight, index) => total + weight * Number(value[index]),
    0,
  );
  return sum % 11;
}

/** A NIP: ten digits, the last its check digit. */
export function isTaxId(value: string) {
  const nip = digits(value);
  if (!/^\d{10}$/.test(nip)) return false;
  const check = checkDigit(nip, [6, 5, 7, 2, 3, 4, 5, 6, 7]);
  return check !== 10 && check === Number(nip[9]);
}

/** A REGON: nine or fourteen digits, the last its check digit. */
export function isRegon(value: string) {
  const regon = digits(value);
  const weights =
    regon.length === 9
      ? [8, 9, 2, 3, 4, 5, 6, 7]
      : regon.length === 14
        ? [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8]
        : null;
  if (!weights || !/^\d+$/.test(regon)) return false;
  return checkDigit(regon, weights) % 10 === Number(regon.at(-1));
}

/** `1234563218` → `123-456-32-18`. */
export function formatTaxId(taxId: string) {
  return taxId.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1-$2-$3-$4");
}

const blankIsNone = (value: string) => value.trim() || null;

export const companyDetailsSchema = z.object({
  legalName: z.string().trim().max(200).transform(blankIsNone),
  taxId: z
    .string()
    .refine(
      (value) => !value.trim() || isTaxId(value),
      "Ten NIP ma błędną cyfrę kontrolną lub długość.",
    )
    .transform((value) => blankIsNone(digits(value))),
  regon: z
    .string()
    .refine(
      (value) => !value.trim() || isRegon(value),
      "Ten REGON ma błędną cyfrę kontrolną lub długość.",
    )
    .transform((value) => blankIsNone(digits(value))),
  registeredAddress: z.string().trim().max(300).transform(blankIsNone),
});

export type CompanyDetailsInput = z.input<typeof companyDetailsSchema>;
export type CompanyDetails = z.output<typeof companyDetailsSchema>;

/**
 * The company in one line (the site's footer): its name and address, then
 * its numbers. None without a name.
 */
export function companyLine(company: CompanyDetails) {
  if (!company.legalName) return null;
  return [
    [company.legalName, company.registeredAddress].filter(Boolean).join(", "),
    company.taxId ? `NIP ${formatTaxId(company.taxId)}` : null,
    company.regon ? `REGON ${company.regon}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
