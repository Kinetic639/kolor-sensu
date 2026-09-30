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

  it("paid on site (booked by the centre): nothing to give back", () => {
    const now = at("2030-10-01T09:00:00Z");
    const unpaid = { ...booking, paid: false };
    expect(
      visitPageCopy({ ...input, booking: unpaid, now }).cancel?.text,
    ).toBe("Możesz odwołać wizytę, jeśli nie możesz przyjść.");
    expect(
      visitPageCopy({
        ...input,
        booking: {
          ...unpaid,
          status: "cancelled" as const,
          cancelledBy: "client" as const,
          refundDueMinor: 0,
        },
        now,
      }).cancelledLead,
    ).toBe("Wizyta została odwołana.");
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
});
