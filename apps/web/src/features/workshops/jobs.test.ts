import { describe, expect, it, vi } from "vitest";
import { runWorkshopJobs, type WorkshopJobDeps } from "./jobs";

function deps(patch: Partial<WorkshopJobDeps> = {}): WorkshopJobDeps {
  return {
    expire: vi.fn().mockResolvedValue(2),
    remindMinimums: vi.fn().mockResolvedValue(1),
    listOwed: vi.fn().mockResolvedValue([]),
    refund: vi.fn().mockResolvedValue(0),
    listDue: vi.fn().mockResolvedValue([]),
    send: vi.fn().mockResolvedValue("sent"),
    ...patch,
  };
}

describe("the workshops' scheduled job", () => {
  it("ends what ran out, reminds of minimums and sends what is due", async () => {
    const d = deps({
      listDue: vi.fn().mockResolvedValue([
        { reference: "W1", kind: "offered" },
        { reference: "W2", kind: "reminder" },
      ]),
    });
    expect(await runWorkshopJobs(d)).toEqual({
      expired: 2,
      minimums: 1,
      refunds: 0,
      refundsFailed: 0,
      emails: { sent: 2, skipped: 0, failed: 0 },
    });
    expect(d.send).toHaveBeenCalledWith("W1", "offered");
  });

  it("gives owed money back and says so; a refusal waits for the next run", async () => {
    const owed = [
      { registrationId: "r1", reference: "W1", owedMinor: 5000 },
      { registrationId: "r2", reference: "W2", owedMinor: 5000 },
    ];
    const d = deps({
      listOwed: vi.fn().mockResolvedValue(owed),
      refund: vi
        .fn()
        .mockResolvedValueOnce(5000)
        .mockRejectedValueOnce(new Error("Stripe")),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runWorkshopJobs(d);
    expect(result).toMatchObject({ refunds: 1, refundsFailed: 1 });
    expect(d.send).toHaveBeenCalledWith("W1", "refunded");
    expect(d.send).not.toHaveBeenCalledWith("W2", "refunded");
  });
});
