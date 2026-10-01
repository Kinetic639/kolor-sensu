import { describe, expect, it } from "vitest";
import {
  centreCancelRequestSchema,
  centreChangeMessage,
  centreMoveSchema,
  centreRefundRequestSchema,
  parseMoneyInput,
} from "./centre-changes";

describe("parseMoneyInput", () => {
  it("reads złoty as typed, into grosze", () => {
    expect(parseMoneyInput("150")).toBe(15000);
    expect(parseMoneyInput(" 150,50 ")).toBe(15050);
    expect(parseMoneyInput("150.5")).toBe(15050);
    expect(parseMoneyInput("0")).toBe(0);
  });

  it("refuses anything else", () => {
    for (const value of ["", "-10", "10,505", "abc", "1 000"]) {
      expect(parseMoneyInput(value)).toBeNull();
    }
  });
});

describe("the centre's requests", () => {
  it("a cancellation: all back by default, or a chosen amount and why", () => {
    expect(centreCancelRequestSchema.parse({})).toEqual({
      refundMinor: null,
      reason: null,
    });
    expect(
      centreCancelRequestSchema.parse({
        refundMinor: 10000,
        reason: "  Późne odwołanie ",
      }),
    ).toEqual({ refundMinor: 10000, reason: "Późne odwołanie" });
    expect(
      centreCancelRequestSchema.safeParse({ refundMinor: -1 }).success,
    ).toBe(false);
  });

  it("a refund later: something to give back", () => {
    expect(
      centreRefundRequestSchema.safeParse({ refundMinor: 0 }).success,
    ).toBe(false);
    expect(centreRefundRequestSchema.parse({ refundMinor: 5000 })).toEqual({
      refundMinor: 5000,
      reason: null,
    });
  });

  it("a move: when, how, where (a room in person)", () => {
    const move = {
      date: "2030-10-02",
      time: "15:00",
      mode: "in_person",
      roomId: null,
      reason: "",
    };
    expect(
      centreMoveSchema
        .safeParse(move)
        .error?.issues.map((issue) => [issue.path[0], issue.message]),
    ).toEqual([["roomId", "Wybierz gabinet."]]);
    expect(centreMoveSchema.parse({ ...move, mode: "online" })).toEqual({
      ...move,
      mode: "online",
      reason: null,
    });
  });
});

describe("centreChangeMessage", () => {
  it("says why in Polish, with a fallback", () => {
    expect(centreChangeMessage("refund_too_high")).toMatch(/więcej/);
    expect(centreChangeMessage("specialist_busy")).toMatch(/inną wizytę/);
    expect(centreChangeMessage("nothing_changed")).toMatch(/już jest/);
    expect(centreChangeMessage(undefined)).toBe(
      "Nie udało się zapisać zmiany.",
    );
  });
});
