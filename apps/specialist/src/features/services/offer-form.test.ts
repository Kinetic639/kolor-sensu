import { describe, expect, it } from "vitest";
import {
  offerFormSchema,
  toOfferFormValues,
  toServiceUpsert,
} from "./offer-form";

const valid = {
  serviceId: "20000000-0000-4000-8000-000000000001",
  price: "180,50",
  supportsInPerson: true,
  supportsOnline: false,
  active: true,
};

describe("offerFormSchema", () => {
  it("accepts a price in złoty (the time is the service's)", () => {
    expect(offerFormSchema.safeParse(valid).success).toBe(true);
  });

  it("explains each invalid field", () => {
    const result = offerFormSchema.safeParse({
      ...valid,
      serviceId: "",
      price: "abc",
      supportsInPerson: false,
    });
    expect(result.success).toBe(false);
    expect(
      Object.fromEntries(
        result.error!.issues.map((issue) => [issue.path[0], issue.message]),
      ),
    ).toEqual({
      serviceId: "Wybierz usługę z katalogu.",
      price: "Podaj cenę, np. 180 lub 180,50.",
      supportsInPerson: "Aktywna usługa musi mieć co najmniej jedną formę.",
    });
  });

  it("allows an inactive offer without a form", () => {
    expect(
      offerFormSchema.safeParse({
        ...valid,
        active: false,
        supportsInPerson: false,
      }).success,
    ).toBe(true);
  });
});

describe("offer form conversion", () => {
  it("turns the form into the upsert contract", () => {
    expect(toServiceUpsert(valid)).toEqual({
      serviceId: valid.serviceId,
      priceMinor: 18050,
      currencyCode: "PLN",
      // The centre sets the time: never the specialist's own.
      durationMinutes: null,
      supportsInPerson: true,
      supportsOnline: false,
      active: true,
    });
  });

  it("fills the form from an existing offer or a fresh one", () => {
    expect(
      toOfferFormValues({
        serviceId: "s",
        priceMinor: 20000,
        supportsInPerson: false,
        supportsOnline: true,
        active: true,
      }),
    ).toMatchObject({ serviceId: "s", price: "200" });
    expect(toOfferFormValues(null)).toMatchObject({
      serviceId: "",
      price: "",
      supportsInPerson: true,
      active: true,
    });
  });
});
