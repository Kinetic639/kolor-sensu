import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { WORKSHOP_SEGMENTS } from "./view-model";

// Warsztaty's list in the address: the segment and the search, so the list
// renders on the server and keeps its view.

export const workshopListParsers = {
  stan: parseAsStringLiteral(WORKSHOP_SEGMENTS).withDefault("nadchodzace"),
  q: parseAsString.withDefault(""),
};

export const loadWorkshopListParams = createLoader(workshopListParsers);

export function workshopListHref(params: { stan: string; q?: string }) {
  const query = new URLSearchParams();
  if (params.stan !== "nadchodzace") query.set("stan", params.stan);
  if (params.q) query.set("q", params.q);
  const text = query.toString();
  return text ? `/warsztaty?${text}` : "/warsztaty";
}
