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
  sendEmail: true,
};

function deps() {
  return {
    timeZone: "Europe/Warsaw",
    book: vi.fn().mockResolvedValue({
      id: "visit-1",
      reference: "3010-001",
      startsAt: "2030-10-02T10:15:00+00:00",
      endsAt: "2030-10-02T11:05:00+00:00",
    }),
    confirm: vi.fn().mockResolvedValue("sent" as const),
  };
}

describe("bookVisitAsCentre", () => {
  it("books at the centre's local time and sends the confirmation", async () => {
    const d = deps();
    expect(await bookVisitAsCentre(body, d)).toEqual({
      ok: true,
      id: "visit-1",
      reference: "3010-001",
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
    expect(d.confirm).toHaveBeenCalledWith("3010-001");
  });

  it("sends nothing when asked not to", async () => {
    const d = deps();
    const result = await bookVisitAsCentre(
      { ...body, email: "", phone: "600 100 200", sendEmail: false },
      d,
    );
    expect(result).toMatchObject({ ok: true, emailed: "skipped" });
    expect(d.confirm).not.toHaveBeenCalled();
  });

  it("an invalid form says what is wrong, before the database", async () => {
    const d = deps();
    expect(
      await bookVisitAsCentre({ ...body, email: "", phone: "" }, d),
    ).toEqual({
      ok: false,
      code: "invalid",
      fields: { email: "Podaj e-mail albo telefon klienta." },
    });
    expect(await bookVisitAsCentre("nonsense", d)).toMatchObject({
      ok: false,
      code: "invalid",
    });
    expect(d.book).not.toHaveBeenCalled();
  });

  it("passes on why the database refused", async () => {
    const d = deps();
    d.book.mockRejectedValue(new BookingError("room_busy", "Taken"));
    expect(await bookVisitAsCentre(body, d)).toEqual({
      ok: false,
      code: "room_busy",
    });
    expect(d.confirm).not.toHaveBeenCalled();
  });
});
