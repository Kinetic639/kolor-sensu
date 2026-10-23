import { describe, expect, it, vi } from "vitest";
import { isCronRequest, runPaymentJobs } from "./payment-jobs";

describe("runPaymentJobs", () => {
  it("asks Stripe about stuck payments, cancels the unpaid, then sends every e-mail due", async () => {
    const order: string[] = [];
    const deps = {
      checkStuck: vi.fn(async () => {
        order.push("stuck");
        return 2;
      }),
      cancelUnpaid: vi.fn(async () => {
        order.push("cancel");
        return ["2609-002"];
      }),
      listDue: vi.fn(async () => {
        order.push("list");
        return [
          { reference: "2609-002", kind: "cancelled" as const },
          { reference: "2609-003", kind: "payment_reminder" as const },
          { reference: "2609-004", kind: "reminder" as const },
        ];
      }),
      send: vi
        .fn()
        .mockResolvedValueOnce("sent")
        .mockResolvedValueOnce("failed")
        .mockResolvedValueOnce("skipped"),
    };
    expect(await runPaymentJobs(deps)).toEqual({
      stuck: 2,
      cancelled: ["2609-002"],
      sent: 1,
      skipped: 1,
      failed: 1,
    });
    expect(order).toEqual(["stuck", "cancel", "list"]);
    expect(deps.send).toHaveBeenCalledWith("2609-002", "cancelled");
    expect(deps.send).toHaveBeenCalledWith("2609-003", "payment_reminder");
  });

  it("never sends the e-mails about a change (they go with the change)", async () => {
    const deps = {
      checkStuck: vi.fn().mockResolvedValue(0),
      cancelUnpaid: vi.fn().mockResolvedValue([]),
      listDue: vi
        .fn()
        .mockResolvedValue([{ reference: "1", kind: "rescheduled" }]),
      send: vi.fn(),
    };
    await runPaymentJobs(deps);
    expect(deps.send).not.toHaveBeenCalled();
  });
});

describe("isCronRequest", () => {
  const request = (authorization?: string) =>
    new Request("https://kolorsensu.pl/api/cron/platnosci", {
      headers: authorization ? { authorization } : {},
    });

  it("lets in the scheduler with the secret only", () => {
    expect(isCronRequest(request("Bearer s3cret"), "s3cret")).toBe(true);
    expect(isCronRequest(request("Bearer wrong"), "s3cret")).toBe(false);
    expect(isCronRequest(request(), "s3cret")).toBe(false);
    // No secret set: nobody.
    expect(isCronRequest(request("Bearer "), undefined)).toBe(false);
  });
});
