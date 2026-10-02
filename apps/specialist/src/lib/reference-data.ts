import "server-only";
import {
  getBookingWindow,
  listActiveRoomsForSpecialist,
  listAvailableServicesForSpecialist,
} from "@repo/supabase";
import { CACHE_TAGS, cachedForCaller } from "./cached";

// The portal's reference data, kept between requests (./cached): read on
// nearly every page, changed rarely.

/** The centre's booking window and time zone. */
export function bookingWindow() {
  return cachedForCaller("booking-window", [CACHE_TAGS.centre], (client) =>
    getBookingWindow(client),
  );
}

/** The services this specialist may offer. */
export function myServices() {
  return cachedForCaller("services", [CACHE_TAGS.services], (client) =>
    listAvailableServicesForSpecialist(client),
  );
}

/** The rooms this specialist may work in. */
export function myRooms() {
  return cachedForCaller("rooms", [CACHE_TAGS.rooms], (client) =>
    listActiveRoomsForSpecialist(client),
  );
}
