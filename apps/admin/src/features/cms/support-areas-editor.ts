import {
  supportAreasContentSchema,
  type SupportAreasContent,
} from "@repo/contracts";
import type { SupportAreaRow } from "./types";

/** What is wrong with the list, by "area index.field" ("2.title"). */
export type Problems = Record<string, string>;

const fieldMessages: Record<string, string> = {
  title: "Podaj nazwę (do 60 znaków).",
  lead: "Podaj opis (do 240 znaków).",
  href: "Podaj adres na stronie, zaczynający się od / (np. /oferta).",
  label: "Podaj tekst linku (do 40 znaków).",
};

/** The fields the CMS would refuse, each with what to do about it. */
export function problemsOf(areas: readonly SupportAreaRow[]): Problems {
  const result = supportAreasContentSchema.safeParse(
    toSupportAreasContent(areas),
  );
  if (result.success) return {};
  const problems: Problems = {};
  for (const issue of result.error.issues) {
    const [, index, field, sub] = issue.path;
    if (index === undefined) {
      problems.list ??= issue.message;
      continue;
    }
    const name = String(sub ?? field);
    problems[`${String(index)}.${name}`] ??=
      fieldMessages[name] ?? issue.message;
  }
  return problems;
}

// The CMS's list of areas of help, edited in the browser before it is saved
// as the draft: add, remove, move, change one. Pure, so the form stays thin.

/** An empty area at the end, under an id no other area has. */
export function addArea(areas: readonly SupportAreaRow[]): SupportAreaRow[] {
  const taken = new Set(areas.map((area) => area.id));
  let number = areas.length + 1;
  while (taken.has(`obszar-${number}`)) number += 1;
  return [
    ...areas,
    {
      id: `obszar-${number}`,
      title: "",
      lead: "",
      imagePath: null,
      imageAlt: "",
      link: null,
      imageUrl: null,
    },
  ];
}

export function removeArea(
  areas: readonly SupportAreaRow[],
  index: number,
): SupportAreaRow[] {
  return areas.filter((_, at) => at !== index);
}

/** One place up (-1) or down (1); the same list when it cannot move. */
export function moveArea<T extends readonly SupportAreaRow[]>(
  areas: T,
  index: number,
  step: -1 | 1,
): T | SupportAreaRow[] {
  const target = index + step;
  if (target < 0 || target >= areas.length) return areas;
  const next = [...areas];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function updateArea(
  areas: readonly SupportAreaRow[],
  index: number,
  patch: Partial<SupportAreaRow>,
): SupportAreaRow[] {
  return areas.map((area, at) => (at === index ? { ...area, ...patch } : area));
}

/** The draft to save: the areas as the CMS stores them. */
export function toSupportAreasContent(
  areas: readonly SupportAreaRow[],
): SupportAreasContent {
  return {
    areas: areas.map(({ imageUrl: _preview, ...area }) => area),
  };
}
