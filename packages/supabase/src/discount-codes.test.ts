import { describe, expect, it, vi } from "vitest";
import {
  applyDiscountCode,
  discountRefusal,
  getBookingDiscount,
  listDiscountCodes,
  saveDiscountCode,
} from "./discount-codes";

// Discount codes through the database's functions: the admin's list read
// as the portal shows it, a code saved with every field, a code applied to
// a booking, and a refusal kept as the database's hint.

function rpc(data: unknown, error: unknown = null) {
  const call = vi.fn().mockResolvedValue({ data, error });
  return { call, client: { rpc: call } as never };
}

describe("the admin's codes", () => {
  it("reads the list with its uses", async () => {
    const { client } = rpc([
      {
        id: "d1",
        code: "JESIEN20",
        kind: "percent",
        value: 20,
        starts_on: null,
        ends_on: "2026-11-30",
        active: true,
        note: "",
        created_at: "2026-10-21T10:00:00Z",
        used_count: "3",
        discount_total_minor: "12000",
        scope: "workshops",
        workshop_id: "w1",
        workshop_title: "Uważność",
      },
    ]);
    expect(await listDiscountCodes(client)).toEqual([
      {
        id: "d1",
        code: "JESIEN20",
        kind: "percent",
        value: 20,
        startsOn: null,
        endsOn: "2026-11-30",
        active: true,
        note: "",
        createdAt: "2026-10-21T10:00:00Z",
        usedCount: 3,
        discountTotalMinor: 12000,
        scope: "workshops",
        workshopId: "w1",
        workshopTitle: "Uważność",
      },
    ]);
  });

  it("saves every field", async () => {
    const { call, client } = rpc("d2");
    await saveDiscountCode(client, null, {
      code: "MINUS50",
      kind: "amount",
      value: 5000,
      startsOn: "2026-11-01",
      endsOn: null,
      active: true,
      note: "Listopad",
      scope: "all",
      workshopId: null,
    });
    expect(call).toHaveBeenCalledWith("save_discount_code", {
      p_id: null,
      p_code: "MINUS50",
      p_kind: "amount",
      p_value: 5000,
      p_starts_on: "2026-11-01",
      p_ends_on: null,
      p_active: true,
      p_note: "Listopad",
      p_scope: "all",
      p_workshop_id: null,
    });
  });
});

describe("a code on a booking", () => {
  it("gives the new price", async () => {
    const { client } = rpc([
      {
        code: "JESIEN20",
        list_price_minor: 20000,
        discount_minor: 4000,
        price_minor: 16000,
      },
    ]);
    expect(await applyDiscountCode(client, "token", "jesien20")).toEqual({
      code: "JESIEN20",
      listPriceMinor: 20000,
      discountMinor: 4000,
      priceMinor: 16000,
    });
  });

  it("reads none when the booking has no code", async () => {
    expect(await getBookingDiscount(rpc([]).client, "token")).toBeNull();
  });

  it("keeps a refusal as the database's hint", () => {
    expect(
      discountRefusal({ hint: "code_expired", message: "Code expired" }),
    ).toBe("code_expired");
    expect(discountRefusal({ hint: "", message: "boom" })).toBeNull();
  });
});
