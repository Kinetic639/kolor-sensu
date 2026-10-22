import { describe, expect, it } from "vitest";
import {
  notificationDays,
  notificationView,
  type NotificationLike,
} from "./notification-view";

const base: NotificationLike = {
  id: 1,
  kind: "booked",
  actor: "payment",
  appointmentId: "visit-1",
  createdAt: "2026-10-01T08:05:00+00:00",
  readAt: null,
  details: {
    reference: "2610-004",
    startsAt: "2026-10-08T09:00:00+00:00",
    mode: "online",
    clientName: "Jan Kowalski",
    serviceName: "Konsultacja",
    specialistName: "Michał Stępień",
    fromStartsAt: null,
    reason: null,
    refundMinor: null,
    refundDueMinor: null,
    priceMinor: 20000,
    currencyCode: "PLN",
  },
};

const at = (overrides: Partial<NotificationLike>, details = {}) => ({
  ...base,
  ...overrides,
  details: { ...base.details, ...details },
});

const options = {
  timeZone: "Europe/Warsaw",
  portal: "admin" as const,
  now: new Date("2026-10-01T12:00:00+00:00"),
};

const ids = (view: ReturnType<typeof notificationView>) =>
  view.badges.map((badge) => badge.id);

describe("notificationView", () => {
  it("a new paid visit: a short title, whose and when, the rest to open", () => {
    const view = notificationView(base, options);
    expect(view).toMatchObject({
      id: 1,
      title: "Nowa rezerwacja",
      reference: "2610-004",
      summary: "Jan Kowalski · czw. 08.10, 11:00",
      tone: "success",
      icon: "new",
      href: "/rezerwacje?zakres=wszystkie&q=2610-004&wizyta=visit-1",
      day: "Dziś",
      time: "10:05",
      unread: true,
    });
    // The facts as small icons, their words for the tooltip.
    expect(view.badges).toEqual([
      {
        id: "paid-now",
        label: "Opłacona online przy rezerwacji",
        tone: "success",
      },
      { id: "online", label: "Wizyta online", tone: "info" },
    ]);
    expect(view.details).toEqual([
      { label: "Termin", value: "czw. 08.10.2026, 11:00" },
      { label: "Usługa", value: "Konsultacja" },
      { label: "Cena", value: expect.stringMatching(/^200\s?zł$/) },
    ]);
  });

  it("each kind in two or three words", () => {
    const title = (o: Partial<NotificationLike>) =>
      notificationView(at(o), options).title;
    expect(title({ kind: "reserved", actor: "client" })).toBe(
      "Nowa rezerwacja",
    );
    expect(title({ kind: "centre_booked", actor: "centre" })).toBe(
      "Nowa rezerwacja",
    );
    expect(title({ kind: "paid" })).toBe("Rezerwacja opłacona");
    expect(title({ kind: "rescheduled", actor: "client" })).toBe(
      "Rezerwacja przełożona",
    );
    expect(title({ kind: "cancelled", actor: "system" })).toBe(
      "Rezerwacja anulowana",
    );
    expect(title({ kind: "refunded", actor: "centre" })).toBe(
      "Zwrot pieniędzy",
    );
  });

  it("who did it, the payment and the refund, as icons", () => {
    const badges = (o: Partial<NotificationLike>, d = {}) =>
      notificationView(at(o, { mode: "in_person", ...d }), options).badges;
    expect(badges({ kind: "reserved", actor: "client" })).toEqual([
      { id: "pay-later", label: "Płatność później", tone: "warning" },
    ]);
    expect(badges({ kind: "centre_booked", actor: "centre" })[0]).toEqual({
      id: "centre",
      label: "Umówiona przez centrum",
      tone: "neutral",
    });
    expect(
      badges({ kind: "cancelled", actor: "client" }, { refundDueMinor: 24000 }),
    ).toEqual([
      { id: "client", label: "Odwołana przez klienta", tone: "neutral" },
      {
        id: "refund-due",
        label: expect.stringMatching(/^Do zwrotu: 240\s?zł$/),
        tone: "warning",
      },
    ]);
    expect(
      badges({ kind: "cancelled", actor: "centre" }, { refundDueMinor: 0 }),
    ).toEqual([
      { id: "centre", label: "Odwołana przez centrum", tone: "neutral" },
      { id: "no-refund", label: "Bez zwrotu", tone: "neutral" },
    ]);
    expect(
      badges({ kind: "cancelled", actor: "system" }, { reason: "unpaid" }),
    ).toEqual([
      {
        id: "system",
        label: "Anulowana automatycznie: brak płatności",
        tone: "danger",
      },
    ]);
    expect(
      badges({ kind: "refunded", actor: "centre" }, { refundMinor: 5050 }),
    ).toEqual([
      {
        id: "refunded",
        label: expect.stringMatching(/^Zwrócono 50,50\s?zł$/),
        tone: "success",
      },
    ]);
  });

  it("a change shortly before the visit says so; at most three icons", () => {
    const view = notificationView(
      at(
        { kind: "rescheduled", actor: "centre" },
        { startsAt: "2026-10-02T09:00:00+00:00" },
      ),
      options,
    );
    expect(ids(view)).toEqual(["centre", "online", "soon"]);
    expect(view.badges[2]!.label).toBe("Wizyta za mniej niż 48 h");
  });

  it("a specialist's own: no money, no name of theirs", () => {
    const view = notificationView(
      at({ kind: "cancelled", actor: "client" }, { refundDueMinor: 20000 }),
      { ...options, portal: "specialist" },
    );
    expect(ids(view)).toEqual(["client", "online"]);
    expect(view.details.map((d) => d.label)).toEqual(["Termin", "Usługa"]);
  });

  it("opened, it tells the rest: the earlier time, the refund, the reason", () => {
    const moved = notificationView(
      at(
        { kind: "rescheduled", actor: "client" },
        { fromStartsAt: "2026-10-07T09:00:00+00:00" },
      ),
      options,
    );
    expect(moved.details[1]).toEqual({
      label: "Wcześniej",
      value: "śr. 07.10.2026, 11:00",
    });
    const cancelled = notificationView(
      at(
        { kind: "cancelled", actor: "centre" },
        { refundDueMinor: 10000, reason: "Choroba specjalisty" },
      ),
      options,
    );
    expect(cancelled.details.slice(-2)).toEqual([
      {
        label: "Zwrot",
        value: expect.stringMatching(/^100\s?zł do zwrotu$/),
        tone: "warning",
      },
      { label: "Powód", value: "Choroba specjalisty" },
    ]);
  });

  it("says when: today, yesterday, or the weekday and date; read or not", () => {
    const view = (createdAt: string) =>
      notificationView(at({ createdAt }), options);
    expect(view("2026-09-30T19:30:00+00:00")).toMatchObject({
      day: "Wczoraj",
      time: "21:30",
    });
    expect(view("2026-09-28T07:00:00+00:00")).toMatchObject({
      day: "Poniedziałek 28.09",
      time: "09:00",
    });
    expect(
      notificationView(at({ readAt: "2026-10-01T09:00:00+00:00" }), options)
        .unread,
    ).toBe(false);
  });

  it("missing facts are left out, never shown as blanks", () => {
    const view = notificationView(
      at(
        { appointmentId: null },
        { clientName: null, startsAt: null, serviceName: null, mode: null },
      ),
      options,
    );
    expect(view.summary).toBe("");
    expect(view.href).toBeNull();
    expect(view.details.map((d) => d.label)).toEqual(["Cena"]);
  });
});

describe("a profile sent for review", () => {
  const profile = at(
    {
      kind: "profile_submitted",
      actor: "specialist",
      appointmentId: null,
      createdAt: "2026-10-01T09:30:00+00:00",
    },
    {
      reference: null,
      startsAt: null,
      mode: null,
      clientName: null,
      serviceName: null,
      priceMinor: null,
      currencyCode: null,
      specialistName: "Anna Kłobuchowska",
      specialistId: "anna",
    },
  );

  it("whose profile, leading to it on their page, no booking", () => {
    const view = notificationView(profile, options);
    expect(view).toMatchObject({
      title: "Profil do weryfikacji",
      summary: "Anna Kłobuchowska",
      tone: "info",
      icon: "profile",
      reference: null,
      visitId: null,
      href: "/specjalisci/anna?zakladka=profil",
      linkText: "Profil",
      badges: [],
      // Shown as their chip, with their picture.
      person: { id: "anna", name: "Anna Kłobuchowska" },
      details: [{ label: "Wysłany", value: "czw. 01.10.2026, 11:30" }],
    });
  });

  it("for the specialist: approved, on the site; rejected, with the reason", () => {
    const mine = { ...options, portal: "specialist" as const };
    expect(
      notificationView(
        { ...profile, kind: "profile_approved", actor: "centre" },
        mine,
      ),
    ).toMatchObject({
      title: "Profil zatwierdzony",
      summary: "Zmiany są już na stronie",
      tone: "success",
      icon: "profile",
      href: "/profil",
      linkText: "Profil",
      person: null,
      details: [{ label: "Zatwierdzony", value: "czw. 01.10.2026, 11:30" }],
    });
    expect(
      notificationView(
        {
          ...profile,
          kind: "profile_rejected",
          actor: "centre",
          details: { ...profile.details, reason: "Popraw opis." },
        },
        mine,
      ),
    ).toMatchObject({
      title: "Profil do poprawy",
      summary: "Popraw opis.",
      tone: "warning",
      href: "/profil",
      details: [
        { label: "Odesłany", value: "czw. 01.10.2026, 11:30" },
        { label: "Powód", value: "Popraw opis." },
      ],
    });
  });

  it("a booking's link is its number", () => {
    expect(notificationView(base, options).linkText).toBe("2610-004");
  });
});

describe("a visit to close", () => {
  it("too many unpaid reservations: a warning for the admins, leading to it", () => {
    const view = notificationView(
      at({ kind: "unpaid_limit", actor: "system" }),
      options,
    );
    expect(view).toMatchObject({
      title: "Za dużo nieopłaconych rezerwacji",
      summary: "Jan Kowalski · czw. 08.10, 11:00",
      tone: "warning",
      icon: "reserved",
      reference: "2610-004",
    });
    expect(ids(view)).toContain("system");
    expect(view.details).toContainEqual(
      expect.objectContaining({ label: "Co się stało" }),
    );
  });

  it("a dispute: a warning with the amount and Stripe's reason", () => {
    const view = notificationView(
      at(
        { kind: "disputed", actor: "payment" },
        { amountMinor: 25000, disputeReason: "fraudulent" },
      ),
      options,
    );
    expect(view).toMatchObject({
      title: "Spór o płatność",
      tone: "danger",
      icon: "refund",
      reference: "2610-004",
    });
    expect(view.details).toContainEqual({
      label: "Kwota sporu",
      value: expect.stringMatching(/^250\s+zł$/),
    });
    expect(view.details).toContainEqual(
      expect.objectContaining({ label: "Co zrobić" }),
    );
  });

  it("a dispute closed: won or lost", () => {
    const won = notificationView(
      at(
        { kind: "dispute_closed", actor: "payment" },
        { disputeStatus: "won" },
      ),
      options,
    );
    const lost = notificationView(
      at(
        { kind: "dispute_closed", actor: "payment" },
        { disputeStatus: "lost" },
      ),
      options,
    );
    expect(won).toMatchObject({ title: "Spór wygrany", tone: "success" });
    expect(lost).toMatchObject({ title: "Spór przegrany", tone: "danger" });
  });

  it("what, when, and the way to it", () => {
    const view = notificationView(
      at({ kind: "visit_to_close", actor: "system" }, { clientName: null }),
      { ...options, portal: "specialist" },
    );
    expect(view).toMatchObject({
      title: "Wizyta do zamknięcia",
      summary: "Konsultacja · czw. 08.10, 11:00",
      tone: "warning",
      icon: "closing",
      reference: "2610-004",
      linkText: "2610-004",
    });
    expect(view.href).toContain("2610-004");
  });
});

describe("notificationDays", () => {
  it("groups them by day, in order", () => {
    const views = [
      "2026-10-01T10:00:00+00:00",
      "2026-10-01T08:00:00+00:00",
      "2026-09-30T08:00:00+00:00",
    ].map((createdAt, id) => notificationView(at({ id, createdAt }), options));
    expect(
      notificationDays(views).map((d) => [d.day, d.items.map((i) => i.id)]),
    ).toEqual([
      ["Dziś", [0, 1]],
      ["Wczoraj", [2]],
    ]);
  });
});
