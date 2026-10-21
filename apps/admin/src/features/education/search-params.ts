import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { EDUCATION_SEGMENTS } from "./view-model";

// Edukacja's lists in the address: the segment, the category (articles)
// and the search, so each list renders on the server and keeps its view.

export const educationListParsers = {
  stan: parseAsStringLiteral(EDUCATION_SEGMENTS).withDefault("wszystkie"),
  kategoria: parseAsString,
  q: parseAsString.withDefault(""),
};

export const loadEducationListParams = createLoader(educationListParsers);

/** A list's address with one segment or category chosen. */
export function listHref(
  path: "/artykuly" | "/ebooki",
  params: { stan: string; kategoria?: string | null; q?: string },
): string {
  const query = new URLSearchParams();
  if (params.stan !== "wszystkie") query.set("stan", params.stan);
  if (params.kategoria) query.set("kategoria", params.kategoria);
  if (params.q) query.set("q", params.q);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}
