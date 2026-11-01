import { render } from "@react-email/components";
import type {
  ClaimedWorkshopEmail,
  WorkshopEmailKind,
} from "@repo/supabase/workshops";
import { describe, expect, it } from "vitest";
import { ConfirmationEmail } from "@/features/booking/email/confirmation-email";
import { workshopEmailContent } from "./content";

// Every e-mail about a workshop ends with help in a crisis: 112 and the
// site's page about it (Warsztat · 6, card 7), as the visits' do.

const email: ClaimedWorkshopEmail = {
  reference: "W2611-004",
  manageToken: "tok",
  clientName: "Ola",
  clientEmail: "ola@example.invalid",
  workshopTitle: "Uważność",
  workshopSlug: "uwaznosc",
  modality: "online",
  startsAt: "2030-11-12T16:00:00Z",
  endsAt: "2030-11-12T18:00:00Z",
  locationName: null,
  locationAddress: null,
  locationDirections: null,
  roomName: null,
  leaders: "Anna Nowak",
  priceMinor: 15000,
  paidMinor: 15000,
  currencyCode: "PLN",
  paymentDueAt: "2030-11-05T16:00:00Z",
  waitlistPosition: 2,
  offerExpiresAt: "2030-11-02T16:00:00Z",
  cancelledBy: "client",
  cancelReason: null,
  refundDueMinor: 15000,
  refundedMinor: 15000,
  refundWhenReplaced: false,
  meetingUrl: "https://meet.example.invalid/uwaznosc",
  paidOutside: false,
};

const KINDS: WorkshopEmailKind[] = [
  "confirmation",
  "reserved",
  "waitlisted",
  "offered",
  "payment_reminder",
  "reminder",
  "cancelled",
  "rescheduled",
  "refunded",
  "seat_lost",
];

describe("a workshop's e-mails, at their foot", () => {
  it.each(KINDS)(
    "%s: 112 and the page about help in a crisis",
    async (kind) => {
      const content = workshopEmailContent(kind, email, {
        siteUrl: "https://kolorsensu.pl",
        timeZone: "Europe/Warsaw",
        contact: { phone: "+48 600 100 200" },
      });
      const html = await render(<ConfirmationEmail content={content} />);
      expect(html).toContain("dzwoń pod 112");
      expect(html).toContain('href="https://kolorsensu.pl/pomoc-w-kryzysie"');
    },
  );
});
