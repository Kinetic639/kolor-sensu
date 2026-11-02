import { describe, expect, it } from "vitest";
import { staleLinkView } from "./stale-visit-link";

// A visit link an e-mail since replaced (#259): the payment just made, or
// where the current link is; never "this page does not exist".

describe("staleLinkView", () => {
  it("says a payment made from the old link went through", () => {
    for (const outcome of ["confirmed", "already_confirmed"]) {
      expect(staleLinkView(outcome)).toEqual({
        title: "Płatność przyjęta",
        lead: expect.stringContaining("aktualnym linkiem") as string,
      });
    }
  });

  it("says a bank still confirming, or the money given back", () => {
    expect(staleLinkView("awaiting_payment").title).toBe(
      "Czekamy na potwierdzenie płatności",
    );
    expect(staleLinkView("slot_lost").title).toBe("Zwróciliśmy tę płatność");
    expect(staleLinkView("refund_payment").title).toBe(
      "Zwróciliśmy tę płatność",
    );
  });

  it("otherwise points to the newest e-mail", () => {
    for (const outcome of [null, "already_settled", "unknown_session"]) {
      expect(staleLinkView(outcome)).toEqual({
        title: "Ten link jest już nieaktualny",
        lead: expect.stringContaining("najnowszego e-maila") as string,
      });
    }
  });
});
