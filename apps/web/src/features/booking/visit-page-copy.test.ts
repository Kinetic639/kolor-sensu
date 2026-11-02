import { describe, expect, it } from "vitest";
import { visitPageCopy } from "./visit-page-copy";

const token = "a".repeat(43);
const policy = {
  cancellationWindowHours: 48,
  rescheduleWindowHours: 48,
  maxSelfReschedules: 1,
};
const booking = {
  status: "confirmed" as const,
  startsAt: "2030-10-10T09:00:00.000Z",
  rescheduleCount: 0,
  priceMinor: 20000,
  currencyCode: "PLN",
  cancelledBy: null,
  refundDueMinor: null,
  refundedMinor: 0,
  paid: true,
  paymentDueAt: null,
  movedByCentre: false,
};
const input = { token, booking, policy, timeZone: "Europe/Warsaw" };
const at = (iso: string) => new Date(iso);

describe("visitPageCopy", () => {
  it("well ahead: move it yourself once, or cancel with the money back", () => {
    const copy = visitPageCopy({ ...input, now: at("2030-10-01T09:00:00Z") });
    expect(copy.reschedule).toEqual({
      text: "Możesz samodzielnie przełożyć wizytę do 8 października 2030, godz. 11:00. Zrobisz to jeden raz; kolejne zmiany ustalisz z centrum.",
      href: `/wizyta/${token}/przeloz`,
    });
    expect(copy.cancel).toEqual({
      text: "Odwołując wizytę do 8 października 2030, godz. 11:00, otrzymasz pełny zwrot (200 zł). Później odwołanie jest możliwe już bez zwrotu.",
      href: `/wizyta/${token}/odwolaj`,
    });
  });

  it("the centre moved it: cancelling with the money back until the visit", () => {
    const copy = visitPageCopy({
      ...input,
      booking: { ...booking, movedByCentre: true },
      now: at("2030-10-09T09:00:00Z"),
    });
    expect(copy.cancel?.text).toBe(
      "Termin tej wizyty zmieniło centrum. Jeśli Ci nie pasuje, możesz ją odwołać do jej rozpoczęcia i otrzymasz pełny zwrot (200 zł).",
    );
  });

  it("inside 48 hours: moving through the centre, cancelling without a refund", () => {
    const copy = visitPageCopy({ ...input, now: at("2030-10-09T09:00:00Z") });
    expect(copy.reschedule).toEqual({
      text: "Na mniej niż 48 godz. przed wizytą termin można zmienić tylko po kontakcie z centrum.",
      href: null,
    });
    expect(copy.cancel?.text).toBe(
      "Do wizyty zostało mniej niż 48 godz., więc odwołanie jest możliwe już bez zwrotu opłaty.",
    );
  });

  it("its time has come: it took place, nothing to change (Klient · 6, card 9)", () => {
    const copy = visitPageCopy({ ...input, now: at("2030-10-10T09:00:00Z") });
    expect(copy.past).toBe(true);
    expect(copy.reschedule).toBeNull();
    expect(copy.cancel).toBeNull();
    expect(
      visitPageCopy({ ...input, now: at("2030-10-10T08:59:00Z") }).past,
    ).toBe(false);
  });

  it("moved once already: the next move through the centre", () => {
    const copy = visitPageCopy({
      ...input,
      booking: { ...booking, rescheduleCount: 1 },
      now: at("2030-10-01T09:00:00Z"),
    });
    expect(copy.reschedule).toEqual({
      text: "Wizyta była już przekładana. Kolejną zmianę terminu ustalisz, kontaktując się z centrum.",
      href: null,
    });
  });

  it("a cancelled visit: what happens with the money, and no changes", () => {
    const cancelled = {
      ...booking,
      status: "cancelled" as const,
      cancelledBy: "client" as const,
    };
    const now = at("2030-10-01T09:00:00Z");
    const refunding = visitPageCopy({
      ...input,
      booking: { ...cancelled, refundDueMinor: 20000 },
      now,
    });
    expect(refunding.cancelledLead).toBe(
      "Zwrot 200 zł zleci centrum. Pieniądze zwykle wracają w ciągu kilku dni roboczych.",
    );
    expect(refunding.reschedule).toBeNull();
    expect(refunding.cancel).toBeNull();
    expect(
      visitPageCopy({
        ...input,
        booking: { ...cancelled, refundDueMinor: 20000, refundedMinor: 20000 },
        now,
      }).cancelledLead,
    ).toBe(
      "Zleciliśmy zwrot 200 zł tą samą metodą, którą zapłacono. Pieniądze zwykle wracają w ciągu kilku dni roboczych.",
    );
    expect(
      visitPageCopy({
        ...input,
        booking: { ...cancelled, refundDueMinor: 0 },
        now,
      }).cancelledLead,
    ).toBe("Wizyta została odwołana bez zwrotu opłaty.");
  });

  it("a reservation: pay by its time from here, or cancel it", () => {
    const now = at("2030-10-01T09:00:00Z");
    const reserved = {
      ...booking,
      status: "awaiting_payment" as const,
      paid: false,
      paymentDueAt: "2030-10-08T09:00:00.000Z",
    };
    const copy = visitPageCopy({ ...input, booking: reserved, now });
    expect(copy.pay).toEqual({
      text: "Opłać wizytę online do 8 października 2030, godz. 11:00. Jeśli nie zapłacisz do tego czasu, rezerwacja zostanie anulowana.",
      href: `/wizyta/${token}/platnosc`,
    });
    expect(copy.cancel?.text).toBe(
      "Jeśli nie możesz przyjść, odwołaj rezerwację. Nie jest opłacona, więc nie ma nic do zwrotu.",
    );
    expect(copy.reschedule).toBeNull();
    expect(visitPageCopy({ ...input, now }).pay).toBeNull();
  });

  it("cancelled for want of payment, or by the client before paying", () => {
    const now = at("2030-10-09T09:00:00Z");
    const cancelled = {
      ...booking,
      status: "cancelled" as const,
      paid: false,
      refundDueMinor: 0,
      paymentDueAt: "2030-10-08T09:00:00.000Z",
    };
    expect(
      visitPageCopy({
        ...input,
        booking: { ...cancelled, cancelledBy: "system" as const },
        now,
      }).cancelledLead,
    ).toBe(
      "Rezerwacja została anulowana, bo nie została opłacona w wyznaczonym czasie. Jeśli chcesz przyjść, umów nowy termin.",
    );
    expect(
      visitPageCopy({
        ...input,
        booking: { ...cancelled, cancelledBy: "client" as const },
        now,
      }).cancelledLead,
    ).toBe("Rezerwacja została odwołana.");
  });

  it("says what just changed", () => {
    const now = at("2030-10-01T09:00:00Z");
    expect(visitPageCopy({ ...input, now, change: "przelozona" }).notice).toBe(
      "Wizyta została przełożona. Wysłaliśmy e-mail z nowym terminem.",
    );
    expect(visitPageCopy({ ...input, now, change: "odwolana" }).notice).toBe(
      "Wizyta została odwołana. Wysłaliśmy potwierdzenie e-mailem.",
    );
    expect(visitPageCopy({ ...input, now }).notice).toBeNull();
  });

  it("the link to pay opened after paying: already paid (Klient · 5, card 10)", () => {
    const now = at("2030-10-01T09:00:00Z");
    const copy = visitPageCopy({ ...input, now, change: "oplacona" });
    expect(copy.notice).toBe(
      "Ta wizyta jest już opłacona. Nie musisz płacić ponownie.",
    );
    // Nothing more to pay from the page.
    expect(copy.pay).toBeNull();
  });
});
