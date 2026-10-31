import { beforeEach, describe, expect, it, vi } from "vitest";

// The actions around a held time: "Zacznij od nowa" (Klient · 1, card 15),
// back in the wizard (Klient · 2, card 5), another time held over an
// earlier one and details sent from another tab (card 7). The database,
// Stripe and the cookies are stand-ins here; holding and releasing
// themselves are the database's (booking_domain.sql, C–H).

const db = vi.hoisted(() => ({
  releaseHold: vi.fn(async () => true),
  pendingCheckoutSession: vi.fn(async (): Promise<string | null> => null),
  getBooking: vi.fn(async (): Promise<unknown> => null),
  holdSlot: vi.fn(async () => ({ accessToken: "new-token" })),
  saveBookingDetails: vi.fn(),
  getBookingRequirements: vi.fn(async () => ({
    earlyStart: false,
    guardian: false,
  })),
}));
const hold = vi.hoisted(() => ({
  readHoldToken: vi.fn(async (): Promise<string | null> => null),
  clearHoldToken: vi.fn(async () => {}),
  saveHoldToken: vi.fn(),
  saveFormerHoldToken: vi.fn(),
}));
const jar = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), set: vi.fn() }));
const expireSession = vi.hoisted(() => vi.fn(async () => {}));
const wizard = vi.hoisted(() => ({ loadWizard: vi.fn() }));

vi.mock("@repo/supabase", () => ({
  ...db,
  attachCheckoutSession: vi.fn(),
  BookingError: class extends Error {
    code = "unknown";
  },
  reserveHold: vi.fn(),
}));
vi.mock("@repo/supabase/discount-codes", () => ({}));
vi.mock("@repo/supabase/intakes", () => ({ attachVisitIntake: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => jar,
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { href });
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/public-data", () => ({
  getBookingWindow: async () => ({ timeZone: "Europe/Warsaw" }),
}));
vi.mock("@/lib/stripe", () => ({ stripeServer: vi.fn() }));
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: () => ({}) }));
vi.mock("./email/confirmation-server", () => ({}));
vi.mock("./guards", () => ({
  clientIp: () => "203.0.113.1",
  turnstileKeys: () => ({ siteKey: "site", secretKey: "secret" }),
  verifyTurnstile: async () => true,
  visitorKey: () => "visitor",
}));
vi.mock("./hold-cookie", () => hold);
vi.mock("./intake-cookie", () => ({ readIntake: async () => null }));
vi.mock("./load-wizard", () => wizard);
vi.mock("./payment-server", () => ({ expireSession }));
vi.mock("@/features/newsletter/signup-server", () => ({}));

const {
  holdTimeAction,
  releaseOnReturnAction,
  saveDetailsAction,
  startOverAction,
} = await import("./actions");

/** Where an action redirects to (Next's redirect throws). */
async function redirected(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    return (error as { href?: string }).href;
  }
  throw new Error("no redirect");
}

const held = {
  reference: "2610-001",
  status: "held",
  startsAt: "2030-01-10T09:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  hold.readHoldToken.mockResolvedValue(null);
  db.getBooking.mockResolvedValue(null);
  db.pendingCheckoutSession.mockResolvedValue(null);
});

describe("startOverAction (Klient · 1, card 15)", () => {
  it("gives the held time back at once, stops its payment, forgets the choices", async () => {
    hold.readHoldToken.mockResolvedValue("hold-token");
    db.pendingCheckoutSession.mockResolvedValue("cs_test_1");

    expect(await redirected(startOverAction)).toBe("/umow-wizyte");
    expect(expireSession).toHaveBeenCalledWith("cs_test_1");
    expect(db.releaseHold).toHaveBeenCalledWith({}, "hold-token");
    expect(hold.clearHoldToken).toHaveBeenCalled();
    // Not kept to fill the next booking in: it starts afresh.
    expect(hold.saveFormerHoldToken).not.toHaveBeenCalled();
    expect(jar.delete).toHaveBeenCalledWith({
      name: "ks_wybory",
      path: "/umow-wizyte",
    });
    expect(jar.delete).toHaveBeenCalledWith({
      name: "ks_rezerwacja",
      path: "/",
    });
  });

  it("without a held time, only the choices go", async () => {
    expect(await redirected(startOverAction)).toBe("/umow-wizyte");
    expect(db.releaseHold).not.toHaveBeenCalled();
    expect(jar.delete).toHaveBeenCalledTimes(2);
  });

  it("still starts afresh when the time could not be given back", async () => {
    hold.readHoldToken.mockResolvedValue("hold-token");
    db.releaseHold.mockRejectedValueOnce(new Error("network"));

    expect(await redirected(startOverAction)).toBe("/umow-wizyte");
    expect(hold.clearHoldToken).toHaveBeenCalled();
  });
});

describe("releaseOnReturnAction (Klient · 2, card 5)", () => {
  it("gives the held time back at once and keeps the details for the next", async () => {
    hold.readHoldToken.mockResolvedValue("hold-token");
    db.getBooking.mockResolvedValue(held);
    db.pendingCheckoutSession.mockResolvedValue("cs_test_2");

    expect(await releaseOnReturnAction()).toBe(
      "czwartek, 10 stycznia 2030, godz. 10:00",
    );
    expect(expireSession).toHaveBeenCalledWith("cs_test_2");
    expect(db.releaseHold).toHaveBeenCalledWith({}, "hold-token");
    expect(hold.clearHoldToken).toHaveBeenCalled();
    expect(hold.saveFormerHoldToken).toHaveBeenCalledWith("hold-token");
  });

  it("back twice: nothing held, nothing happens", async () => {
    expect(await releaseOnReturnAction()).toBeNull();
    // A visit no longer held (paid, reserved, given back) stays as it is.
    hold.readHoldToken.mockResolvedValue("hold-token");
    for (const status of ["released", "awaiting_payment", "confirmed"]) {
      db.getBooking.mockResolvedValue({ ...held, status });
      expect(await releaseOnReturnAction()).toBeNull();
    }
    expect(db.releaseHold).not.toHaveBeenCalled();
    expect(hold.clearHoldToken).not.toHaveBeenCalled();
  });
});

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("another time held over an earlier one (card 6, card 7)", () => {
  it("never creates a hold when changed choices no longer resolve to a free time", async () => {
    for (const panel of [
      { kind: "choices" },
      { kind: "slots", chosen: null },
    ]) {
      wizard.loadWizard.mockResolvedValue({
        params: {
          usluga: "konsultacja",
          forma: "online",
          specjalista: "anna",
          termin: "2030-01-10T10:00",
        },
        view: { panel },
      });
      const href = await redirected(() =>
        holdTimeAction(
          form({ usluga: "konsultacja", termin: "2030-01-10T10:00" }),
        ),
      );
      expect(href).toContain("uwaga=termin-zajety");
      expect(db.holdSlot).not.toHaveBeenCalled();
    }
  });
  it("gives the earlier one back with its payment, and holds the new one", async () => {
    wizard.loadWizard.mockResolvedValue({
      params: {
        usluga: "konsultacja",
        forma: "online",
        lokalizacja: null,
        specjalista: "anna",
      },
      view: {
        panel: {
          kind: "slots",
          chosen: { startsAt: "2030-01-10T10:00:00.000Z", label: "" },
        },
      },
    });
    hold.readHoldToken.mockResolvedValue("earlier-token");
    db.pendingCheckoutSession.mockResolvedValue("cs_earlier");

    expect(
      await redirected(() =>
        holdTimeAction(form({ usluga: "konsultacja", termin: "x" })),
      ),
    ).toBe("/umow-wizyte/dane");
    expect(expireSession).toHaveBeenCalledWith("cs_earlier");
    expect(db.releaseHold).toHaveBeenCalledWith({}, "earlier-token");
    expect(hold.saveFormerHoldToken).toHaveBeenCalledWith("earlier-token");
    expect(db.holdSlot).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ startsAt: "2030-01-10T10:00:00.000Z" }),
    );
    expect(hold.saveHoldToken).toHaveBeenCalledWith("new-token");
    // The header leads to the details from now on (Klient · 1, card 11).
    expect(jar.set).toHaveBeenCalledWith(
      "ks_rezerwacja",
      "/umow-wizyte/dane",
      expect.objectContaining({ path: "/" }),
    );
  });
});

describe("details sent from a tab showing another visit (card 7)", () => {
  it("are not saved to the visit held now; the page shows that one, saying why", async () => {
    hold.readHoldToken.mockResolvedValue("hold-token");
    db.getBooking.mockResolvedValue({ ...held, reference: "2610-002" });

    expect(
      await redirected(() =>
        saveDetailsAction({ status: "idle" }, form({ rezerwacja: "2610-001" })),
      ),
    ).toBe("/umow-wizyte/dane?inna-karta=1");
    expect(db.saveBookingDetails).not.toHaveBeenCalled();
  });

  it("the visit shown is the one held: they go on to be checked", async () => {
    hold.readHoldToken.mockResolvedValue("hold-token");
    db.getBooking.mockResolvedValue(held);

    const state = await saveDetailsAction(
      { status: "idle" },
      form({ rezerwacja: "2610-001" }),
    );
    // Nothing filled in: the form's own errors, not another visit.
    expect(state.status).toBe("invalid");
  });
});

const valid = {
  rezerwacja: "2610-001",
  firstName: "Ewa",
  lastName: "Raz",
  email: "ewa@example.invalid",
  phone: "600 700 900",
  notes: "",
  acceptTerms: "on",
  acceptPrivacy: "on",
};

describe("the details step, the database refusing (Klient · 3)", () => {
  it("one visit at a time: the same person is told and asked for another time (card 17)", async () => {
    hold.readHoldToken.mockResolvedValue("hold-token");
    db.getBooking.mockResolvedValue(held);
    const { BookingError } = await import("@repo/supabase");
    db.saveBookingDetails.mockRejectedValueOnce(
      Object.assign(new BookingError("client_overlap" as never, "x"), {
        code: "client_overlap",
      }),
    );
    const state = await saveDetailsAction({ status: "idle" }, form(valid));
    expect(state).toMatchObject({
      status: "invalid",
      message:
        "Masz już wizytę w tym czasie (na ten sam e-mail albo telefon). Wybierz, proszę, inny termin albo napisz do nas.",
      values: { email: "ewa@example.invalid" },
    });
  });

  it("a visit within 14 days: the request is asked for before anything is saved (card 15)", async () => {
    hold.readHoldToken.mockResolvedValue("hold-token");
    db.getBooking.mockResolvedValue(held);
    db.getBookingRequirements.mockResolvedValueOnce({
      earlyStart: true,
      guardian: false,
    });
    const state = await saveDetailsAction({ status: "idle" }, form(valid));
    expect(state).toMatchObject({
      status: "invalid",
      errors: { acceptEarlyStart: expect.stringContaining("14 dni") },
    });
    expect(db.saveBookingDetails).not.toHaveBeenCalled();
  });

  it("with the request ticked, it is saved with the details (card 15)", async () => {
    hold.readHoldToken.mockResolvedValue("hold-token");
    db.getBooking.mockResolvedValue(held);
    db.getBookingRequirements.mockResolvedValueOnce({
      earlyStart: true,
      guardian: false,
    });
    await redirected(() =>
      saveDetailsAction(
        { status: "idle" },
        form({ ...valid, acceptEarlyStart: "on" }),
      ),
    ).catch(() => undefined);
    expect(db.saveBookingDetails).toHaveBeenCalledWith(
      {},
      "hold-token",
      expect.objectContaining({
        acceptEarlyStart: true,
        confirmGuardian: false,
      }),
    );
  });
});
