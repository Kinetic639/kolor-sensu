import { centreBookingSchema } from "@repo/contracts/booking";
import { zonedInstant } from "@repo/scheduling";
import {
  BookingError,
  type BookingErrorCode,
  type CentreBookedVisit,
  type CentreBookingInput,
} from "@repo/supabase";

// The centre books a visit from a portal's calendar (K5, "+ Nowa wizyta").
// The form is checked again here, the local date and time become an
// instant in the centre's time zone, the database books it as whoever
// signed in (and checks they may), and the confirmation goes by e-mail
// when asked for. Stripe is not involved: the visit is paid on site.

export interface CentreBookingDeps {
  timeZone: string;
  book: (input: CentreBookingInput) => Promise<CentreBookedVisit>;
  /** Sends the confirmation; never throws. */
  confirm: (reference: string) => Promise<"sent" | "skipped" | "failed">;
}

export type CentreBookingResult =
  | {
      ok: true;
      id: string;
      reference: string;
      emailed: "sent" | "skipped" | "failed";
    }
  | { ok: false; code: "invalid"; fields: Record<string, string> }
  | { ok: false; code: BookingErrorCode };

export async function bookVisitAsCentre(
  body: unknown,
  deps: CentreBookingDeps,
): Promise<CentreBookingResult> {
  const parsed = centreBookingSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid",
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0] ?? "form"),
          issue.message,
        ]),
      ),
    };
  }
  const booking = parsed.data;

  let visit: CentreBookedVisit;
  try {
    visit = await deps.book({
      offerId: booking.offerId,
      mode: booking.mode,
      startsAt: zonedInstant(
        booking.date,
        booking.time,
        deps.timeZone,
      ).toISOString(),
      roomId: booking.mode === "in_person" ? booking.roomId : null,
      client: {
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        notes: booking.notes,
      },
    });
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, code: error.code };
    throw error;
  }

  const emailed =
    booking.sendEmail && booking.email
      ? await deps.confirm(visit.reference)
      : "skipped";
  return { ok: true, id: visit.id, reference: visit.reference, emailed };
}
