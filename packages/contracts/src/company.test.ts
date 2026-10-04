import { describe, expect, it } from "vitest";
import {
  companyDetailsSchema,
  companyLine,
  formatTaxId,
  isTaxId,
  isRegon,
} from "./company";

describe("NIP and REGON", () => {
  it("a NIP: ten digits with its check digit (dashes and spaces allowed)", () => {
    expect(isTaxId("1234563218")).toBe(true);
    expect(isTaxId("123-456-32-18")).toBe(true);
    expect(isTaxId("1234563219")).toBe(false);
    expect(isTaxId("123456321")).toBe(false);
  });

  it("a REGON: nine or fourteen digits with its check digit", () => {
    expect(isRegon("123456785")).toBe(true);
    expect(isRegon("123456786")).toBe(false);
    expect(isRegon("12345678512347")).toBe(true);
    expect(isRegon("12345678512348")).toBe(false);
  });

  it("a NIP shown as written in Poland", () => {
    expect(formatTaxId("1234563218")).toBe("123-456-32-18");
  });
});

describe("companyDetailsSchema", () => {
  it("keeps digits only; blank fields are none", () => {
    expect(
      companyDetailsSchema.parse({
        legalName: " Kolor Sensu sp. z o.o. ",
        taxId: "123-456-32-18",
        regon: "",
        registeredAddress: "ul. Długa 1, 61-001 Poznań",
      }),
    ).toEqual({
      legalName: "Kolor Sensu sp. z o.o.",
      taxId: "1234563218",
      regon: null,
      registeredAddress: "ul. Długa 1, 61-001 Poznań",
    });
  });

  it("says what is wrong", () => {
    const result = companyDetailsSchema.safeParse({
      legalName: "",
      taxId: "1234563219",
      regon: "1",
      registeredAddress: "",
    });
    expect(result.success).toBe(false);
    expect(
      Object.fromEntries(
        result.error!.issues.map((issue) => [issue.path[0], issue.message]),
      ),
    ).toEqual({
      taxId: "Ten NIP ma błędną cyfrę kontrolną lub długość.",
      regon: "Ten REGON ma błędną cyfrę kontrolną lub długość.",
    });
  });
});

describe("companyLine", () => {
  it("the company as the footer says it; nothing without a name", () => {
    expect(
      companyLine({
        legalName: "Kolor Sensu sp. z o.o.",
        taxId: "1234563218",
        regon: "123456785",
        registeredAddress: "ul. Długa 1, 61-001 Poznań",
      }),
    ).toBe(
      "Kolor Sensu sp. z o.o., ul. Długa 1, 61-001 Poznań · NIP 123-456-32-18 · REGON 123456785",
    );
    expect(
      companyLine({
        legalName: null,
        taxId: "1234563218",
        regon: null,
        registeredAddress: null,
      }),
    ).toBeNull();
  });
});
