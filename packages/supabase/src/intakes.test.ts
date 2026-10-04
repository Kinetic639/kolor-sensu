import type { IntakeAnswers } from "@repo/contracts/intake";
import { describe, expect, it, vi } from "vitest";
import { BookingError } from "./booking";
import {
  attachVisitIntake,
  getVisitIntake,
  intakeServiceSlugs,
  intakeTokenHash,
  saveVisitIntake,
} from "./intakes";

const answers: IntakeAnswers = {
  mood: 5,
  difficulties: ["anxiety"],
  lifeAreas: ["emotional"],
  support: ["regular-therapy"],
  neurodiversity: "none",
  neurodiversityNeeds: [],
  healthConsent: true,
};

describe("intakeTokenHash", () => {
  it("SHA-256, as Postgres reads a bytea", async () => {
    await expect(intakeTokenHash("abc")).resolves.toBe(
      "\\xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

function insertClient() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));
  return { client: { from } as never, from, insert };
}

describe("saveVisitIntake", () => {
  it("keeps the answers under a new random token's hash, with the consent", async () => {
    const { client, from, insert } = insertClient();
    const token = await saveVisitIntake(client, {
      serviceId: "service-1",
      answers: { ...answers },
    });
    expect(token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(from).toHaveBeenCalledWith("visit_intakes");
    const row = insert.mock.calls[0]![0];
    expect(row).toMatchObject({
      service_id: "service-1",
      version: 1,
      mood: 5,
      answers: {
        difficulties: ["anxiety"],
        lifeAreas: ["emotional"],
        support: ["regular-therapy"],
        neurodiversity: "none",
        neurodiversityNeeds: [],
      },
      token_hash: await intakeTokenHash(token),
    });
    expect(row.health_consent_at).toEqual(expect.any(String));
    // The consent is its time, not an answer.
    expect(row.answers).not.toHaveProperty("healthConsent");
    expect(row.answers).not.toHaveProperty("mood");
  });

  it("a crisis is never kept for a booking", async () => {
    const { client, insert } = insertClient();
    await expect(
      saveVisitIntake(client, {
        serviceId: "service-1",
        answers: { ...answers, mood: 0 },
      }),
    ).rejects.toThrow(/crisis/);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("attachVisitIntake", () => {
  it("ties the intake to the held visit", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    await expect(
      attachVisitIntake({ rpc } as never, "hold-token", "intake-token"),
    ).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("attach_visit_intake", {
      p_access_token: "hold-token",
      p_intake_token: "intake-token",
    });
  });

  it("refused without one where the service asks for it", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "x", hint: "intake_required" },
    });
    const refused = await attachVisitIntake(
      { rpc } as never,
      "hold-token",
      null,
    ).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(BookingError);
    expect((refused as BookingError).code).toBe("intake_required");
  });
});

describe("intakeServiceSlugs", () => {
  it("the services that ask for the questionnaire", async () => {
    const eq = vi
      .fn()
      .mockResolvedValue({ data: [{ slug: "konsultacja" }], error: null });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    await expect(intakeServiceSlugs({ from } as never)).resolves.toEqual(
      new Set(["konsultacja"]),
    );
    expect(eq).toHaveBeenCalledWith("requires_intake", true);
  });
});

describe("getVisitIntake", () => {
  it("a visit's answers, as the specialist reads them", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        mood: 2,
        version: 1,
        created_at: "2026-10-05T08:00:00Z",
        answers: {
          difficulties: ["anxiety", "sleep"],
          lifeAreas: ["work"],
          support: ["unsure"],
          neurodiversity: "none",
          neurodiversityNeeds: [],
        },
      },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const intake = await getVisitIntake(
      { from: () => ({ select }) } as never,
      "visit-1",
    );
    expect(eq).toHaveBeenCalledWith("appointment_id", "visit-1");
    expect(intake).toMatchObject({
      mood: 2,
      outcome: "struggling",
      givenAt: "2026-10-05T08:00:00Z",
    });
    expect(intake!.rows[1]).toEqual({
      label: "Trudności",
      value: "Lęk, Bezsenność lub wybudzanie się",
    });
  });

  it("none for a visit without one, or out of reach", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ eq: () => ({ maybeSingle }) }));
    await expect(
      getVisitIntake({ from: () => ({ select }) } as never, "visit-1"),
    ).resolves.toBeNull();
  });
});
