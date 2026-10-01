import { BookingError } from "@repo/supabase";
import { describe, expect, it, vi } from "vitest";
import { bookVisitAsCentre } from "./centre-booking";

const OFFER = "10000000-0000-4000-8000-000000000001";
const ROOM = "20000000-0000-4000-8000-000000000001";

const body = {
  offerId: OFFER,
  mode: "in_person",
  date: "2030-10-02",
  time: "12:15",
  roomId: ROOM,
  name: "Ewa Klientka",
  email: "ewa@example.com",
  phone: "",
  notes: "",
};

function deps() {
  return {
    timeZone: "Europe/Warsaw",
    book: vi.fn().mockResolvedValue({
      id: "visit-1",
      reference: "3010-001",
      startsAt: "2030-10-02T10:15:00+00:00",
      endsAt: "2030-10-02T11:05:00+00:00",
      paymentDueAt: "2030-09-30T10:15:00+00:00",
    }),
    sendPaymentLink: vi.fn().mockResolvedValue("sent" as const),
  };
}

describe("bookVisitAsCentre", () => {
  it("reserves at the centre's local time and e-mails the link to pay", async () => {
    const d = deps();
    expect(await bookVisitAsCentre(body, d)).toEqual({
      ok: true,
      id: "visit-1",
      reference: "3010-001",
      paymentDueAt: "2030-09-30T10:15:00+00:00",
      emailed: "sent",
    });
    expect(d.book).toHaveBeenCalledWith({
      offerId: OFFER,
      mode: "in_person",
      // 12:15 in Warsaw, summer time.
      startsAt: "2030-10-02T10:15:00.000Z",
      roomId: ROOM,
      client: {
        name: "Ewa Klientka",
        email: "ewa@example.com",
        phone: null,
        notes: null,
      },
    });
    expect(d.sendPaymentLink).toHaveBeenCalledWith("3010-001");
  });

  it("an invalid form says what is wrong, before the database", async () => {
    const d = deps();
    expect(
      await bookVisitAsCentre({ ...body, email: "", phone: "600 100 200" }, d),
    ).toEqual({
      ok: false,
      code: "invalid",
      fields: {
        email: "Podaj e-mail klienta: wyślemy na niego link do płatności.",
      },
    });
    expect(await bookVisitAsCentre("nonsense", d)).toMatchObject({
      ok: false,
      code: "invalid",
    });
    expect(d.book).not.toHaveBeenCalled();
  });

  it("passes on why the database refused", async () => {
    const d = deps();
    d.book.mockRejectedValue(new BookingError("too_soon", "No time to pay"));
    expect(await bookVisitAsCentre(body, d)).toEqual({
      ok: false,
      code: "too_soon",
    });
    expect(d.sendPaymentLink).not.toHaveBeenCalled();
  });
});
