import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GuestBooking } from "@repo/supabase";
const mocked = vi.hoisted(() => ({ getBooking: vi.fn(), cookie: vi.fn() }));
vi.mock("@repo/supabase", () => ({ getBooking: mocked.getBooking }));
vi.mock("@repo/supabase/discount-codes", () => ({
  getBookingDiscount: vi.fn(async () => null),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocked.cookie }),
}));
vi.mock("@/lib/public-data", () => ({
  getBookingWindow: async () => ({ timeZone: "Europe/Warsaw" }),
}));
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: () => ({}) }));
vi.mock("./hold-cookie", () => ({ readHoldToken: async () => "test-token" }));
import { BookingStep, readGuestVisit } from "./booking-step";
const booking = {
  reference: "TEST-1",
  status: "held",
  mode: "online",
  startsAt: "2030-01-07T08:00:00Z",
  endsAt: "2030-01-07T08:50:00Z",
  holdExpiresAt: "2099-01-01T00:00:00Z",
  serviceName: "Konsultacja",
  specialistName: "Anna",
  priceMinor: 20000,
  currencyCode: "PLN",
} as GuestBooking;
beforeEach(() => {
  vi.clearAllMocks();
  mocked.getBooking.mockResolvedValue(booking);
  mocked.cookie.mockReturnValue({
    value: "usluga=konsultacja&specjalista=anna&forma=online",
  });
});
describe("editing a live hold", () => {
  it("exposes all four selection steps while retaining the held local time", async () => {
    const visit = (await readGuestVisit())!;
    expect(visit.editParams).toMatchObject({
      usluga: "konsultacja",
      specjalista: "anna",
      forma: "online",
      termin: "2030-01-07T09:00",
    });
    const html = renderToStaticMarkup(
      <BookingStep current={4} title="Dane" visit={visit}>
        <p>Formularz</p>
      </BookingStep>,
    );
    for (const key of ["usluga", "forma", "specjalista", "termin"])
      expect(html).toContain(`krok=${key}`);
  });
  it("does not offer wizard edits for a confirmed visit or an expired hold", async () => {
    for (const changed of [
      { ...booking, status: "confirmed" },
      { ...booking, holdExpiresAt: "2020-01-01T00:00:00Z" },
    ]) {
      mocked.getBooking.mockResolvedValue(changed);
      const visit = (await readGuestVisit())!;
      expect(visit.editParams).toBeUndefined();
      expect(
        renderToStaticMarkup(
          <BookingStep current={5} title="Potwierdzenie" visit={visit}>
            <p>Treść</p>
          </BookingStep>,
        ),
      ).not.toContain("krok=");
    }
  });
});
