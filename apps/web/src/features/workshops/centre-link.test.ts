import { WorkshopAdminError } from "@repo/supabase/workshops-admin";
import { describe, expect, it, vi } from "vitest";
import { resendWorkshopLink } from "./centre-link";

describe("resendWorkshopLink", () => {
  it("lets the seat's e-mail go again, then sends that one (Warsztat · 6, card 8)", async () => {
    const deps = {
      allow: vi
        .fn()
        .mockResolvedValue({ reference: "W2611-004", kind: "waitlisted" }),
      send: vi.fn().mockResolvedValue("sent" as const),
    };
    expect(await resendWorkshopLink("reg-1", deps)).toEqual({
      ok: true,
      reference: "W2611-004",
      emailed: "sent",
    });
    expect(deps.allow).toHaveBeenCalledWith("reg-1");
    expect(deps.send).toHaveBeenCalledWith("W2611-004", "waitlisted");
  });

  it("passes on why not, and sends nothing", async () => {
    const deps = {
      allow: vi
        .fn()
        .mockRejectedValue(new WorkshopAdminError("recently_sent", "x")),
      send: vi.fn(),
    };
    expect(await resendWorkshopLink("reg-1", deps)).toEqual({
      ok: false,
      code: "recently_sent",
    });
    expect(deps.send).not.toHaveBeenCalled();
  });
});
