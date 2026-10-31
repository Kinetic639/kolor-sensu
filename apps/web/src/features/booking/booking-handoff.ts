import type { Route } from "next";

/** The specialist panel chooses only a service and a local time, never a form. */
export function bookingHandoffHref(
  specialist: string,
  service: string,
  date: string,
  time: string,
): Route {
  return `/umow-wizyte?${new URLSearchParams({ usluga: service, specjalista: specialist, termin: `${date}T${time}`, dalej: "auto" })}` as Route;
}
