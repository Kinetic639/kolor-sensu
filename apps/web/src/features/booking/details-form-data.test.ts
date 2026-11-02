import { describe, expect, it } from "vitest";
import { readDetailsForm } from "./details-form-data";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const filled = {
  firstName: "Jan",
  lastName: "Kowalski",
  email: "jan@example.com",
  phone: "600 100 200",
  notes: "",
  acceptTerms: "on",
  acceptPrivacy: "on",
};

describe("readDetailsForm", () => {
  it("reads the details and ticked consents", () => {
    expect(readDetailsForm(form(filled))).toEqual({
      ok: true,
      details: {
        firstName: "Jan",
        lastName: "Kowalski",
        email: "jan@example.com",
        phone: "600 100 200",
        notes: null,
        acceptTerms: true,
        acceptPrivacy: true,
        acceptEarlyStart: false,
        confirmGuardian: false,
      },
      newsletter: false,
    });
  });

  it("reads the newsletter apart from the booking's consents", () => {
    expect(readDetailsForm(form({ ...filled, newsletter: "on" }))).toEqual(
      expect.objectContaining({ ok: true, newsletter: true }),
    );
  });

  it("says what is wrong, field by field, keeping what was typed", () => {
    const { acceptPrivacy: _, ...rest } = filled;
    const result = readDetailsForm(form({ ...rest, email: "jan@" }));
    expect(result).toEqual({
      ok: false,
      errors: {
        email: "Podaj poprawny adres e-mail.",
        acceptPrivacy:
          "Zaakceptuj politykę prywatności, aby zarezerwować wizytę.",
      },
      values: {
        ...rest,
        email: "jan@",
        acceptTerms: true,
        acceptPrivacy: false,
        acceptEarlyStart: false,
        confirmGuardian: false,
        newsletter: false,
      },
    });
  });

  it("asks for the request to start early only for a visit within 14 days (card 15)", () => {
    const near = { earlyStart: true, guardian: false };
    expect(readDetailsForm(form(filled), near)).toMatchObject({
      ok: false,
      errors: {
        acceptEarlyStart:
          "Zaznacz, że chcesz wizyty przed upływem 14 dni od rezerwacji, albo wybierz późniejszy termin.",
      },
    });
    expect(
      readDetailsForm(form({ ...filled, acceptEarlyStart: "on" }), near),
    ).toMatchObject({ ok: true, details: { acceptEarlyStart: true } });
    // Not asked: a ticked box from elsewhere counts for nothing.
    expect(
      readDetailsForm(form({ ...filled, acceptEarlyStart: "on" })),
    ).toMatchObject({ ok: true, details: { acceptEarlyStart: false } });
  });

  it("asks a parent or guardian to confirm for a service for minors (card 16)", () => {
    const minors = { earlyStart: false, guardian: true };
    expect(readDetailsForm(form(filled), minors)).toMatchObject({
      ok: false,
      errors: {
        confirmGuardian:
          "Tę usługę rezerwuje rodzic lub opiekun prawny: potwierdź to, aby zarezerwować wizytę.",
      },
    });
    expect(
      readDetailsForm(form({ ...filled, confirmGuardian: "on" }), minors),
    ).toMatchObject({ ok: true, details: { confirmGuardian: true } });
  });

  it("turns away a bot that filled the hidden field", () => {
    expect(
      readDetailsForm(form({ ...filled, website: "http://spam" })),
    ).toEqual({
      ok: false,
      bot: true,
    });
  });
});
