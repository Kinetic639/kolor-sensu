import { describe, expect, it } from "vitest";
import {
  offerFormSchema,
  toOfferFormValues,
  toServiceUpsert,
} from "./offer-form";

const valid = {
  serviceId: "20000000-0000-4000-8000-000000000001",
  price: "180,50",
  duration: "",
  supportsInPerson: true,
  supportsOnline: false,
  active: true,
  acceptingNewClients: true,
};

describe("offerFormSchema", () => {
  it("accepts a price in złoty and an empty duration", () => {
    expect(offerFormSchema.safeParse(valid).success).toBe(true);
  });

  it("explains each invalid field", () => {
    const result = offerFormSchema.safeParse({
      ...valid,
      serviceId: "",
      price: "abc",
      duration: "10",
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
      duration: "Czas trwania od 15 do 300 minut.",
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
    expect(toServiceUpsert({ ...valid, duration: " 60 " })).toEqual({
      serviceId: valid.serviceId,
      priceMinor: 18050,
      currencyCode: "PLN",
      durationMinutes: 60,
      supportsInPerson: true,
      supportsOnline: false,
      active: true,
      acceptingNewClients: true,
    });
    expect(toServiceUpsert(valid).durationMinutes).toBeNull();
  });

  it("fills the form from an existing offer or a fresh one", () => {
    expect(
      toOfferFormValues({
        serviceId: "s",
        priceMinor: 20000,
        durationMinutes: 80,
        supportsInPerson: false,
        supportsOnline: true,
        active: true,
        acceptingNewClients: false,
      }),
    ).toMatchObject({ serviceId: "s", price: "200", duration: "80" });
    expect(toOfferFormValues(null)).toMatchObject({
      serviceId: "",
      price: "",
      duration: "",
      supportsInPerson: true,
      active: true,
      acceptingNewClients: true,
    });
  });
});
