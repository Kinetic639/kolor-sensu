import { beforeEach, describe, expect, it, vi } from "vitest";

// "Dodaj do kalendarza" on the confirmation page (Klient · 4, card 6): the
// visit just confirmed, found by the guest's cookie, as a calendar file.

const guest = vi.hoisted(() => ({ readGuestVisit: vi.fn() }));
vi.mock("@/features/booking/booking-step", () => guest);

const { GET } = await import("./route");

const booking = {
  reference: "2610-021",
  status: "confirmed",
  mode: "in_person",
  startsAt: "2030-10-02T09:00:00.000Z",
  endsAt: "2030-10-02T09:50:00.000Z",
  serviceName: "Konsultacja psychologiczna",
  specialistName: "Anna Nowak",
  locationName: "Kolor Sensu",
  roomName: "Gabinet Zielony",
  rescheduleCount: 0,
};

beforeEach(() => guest.readGuestVisit.mockReset());

describe("GET /umow-wizyte/potwierdzenie/kalendarz.ics", () => {
  it("gives the confirmed visit as a calendar file to download", async () => {
    guest.readGuestVisit.mockResolvedValue({ booking });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="wizyta-2610-021.ics"',
    );
    const body = await response.text();
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("DTSTART:20301002T090000Z");
    expect(body).toContain("DTEND:20301002T095000Z");
    expect(body).toContain("SUMMARY:Konsultacja psychologiczna – Kolor Sensu");
    expect(body).toContain("Numer rezerwacji: 2610-021");
  });

  it("nothing for a visit not confirmed, or without the guest's cookie", async () => {
    guest.readGuestVisit.mockResolvedValue({
      booking: { ...booking, status: "held" },
    });
    expect((await GET()).status).toBe(404);
    guest.readGuestVisit.mockResolvedValue(null);
    expect((await GET()).status).toBe(404);
  });
});
