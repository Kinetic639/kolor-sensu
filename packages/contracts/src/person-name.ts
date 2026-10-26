import { z } from "zod";

// A person's first and last name, apart (the owner's decision of 25.10;
// migration 20261026120000): in booking, a workshop seat, the centre's own
// booking and a client's card. The database keeps the whole name too,
// made of the two.

export const personNameFields = {
  firstName: z
    .string()
    .trim()
    .min(1, "Podaj imię.")
    .max(100, "Imię może mieć najwyżej 100 znaków."),
  lastName: z
    .string()
    .trim()
    .min(1, "Podaj nazwisko.")
    .max(100, "Nazwisko może mieć najwyżej 100 znaków."),
};

export interface PersonName {
  firstName: string;
  lastName: string;
}

/** "Anna" + "Nowak": "Anna Nowak", as the database makes it. */
export function fullName({ firstName, lastName }: Partial<PersonName>) {
  return [firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * The parts as kept, or else the whole name split at its last space (as
 * the database splits it): "Anna Maria Nowak": "Anna Maria", "Nowak".
 */
export function nameParts(
  whole: string | null | undefined,
  first?: string | null,
  last?: string | null,
): PersonName {
  if (first || last) return { firstName: first ?? "", lastName: last ?? "" };
  const name = (whole ?? "").trim();
  const space = name.search(/\s+\S+$/);
  return space > 0
    ? {
        firstName: name.slice(0, space).trim(),
        lastName: name.slice(space).trim(),
      }
    : { firstName: name, lastName: "" };
}

/** "Anna" + "Nowak": "Nowak Anna", for lists sorted by the last name. */
export function sortName({ firstName, lastName }: Partial<PersonName>) {
  return [lastName, firstName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

/** By last name, then first name, as Polish sorts them. */
export function byLastName(a: Partial<PersonName>, b: Partial<PersonName>) {
  return sortName(a).localeCompare(sortName(b), "pl", { sensitivity: "base" });
}
