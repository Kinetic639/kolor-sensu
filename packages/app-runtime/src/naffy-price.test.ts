import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchNaffyPrice,
  isNaffyProductUrl,
  naffyPriceView,
  parseNaffyPrice,
} from "./naffy-price.js";

// The product data as a real Naffy product page carries it (21.10.2026,
// "TECZKA początkującego PSYCHOLOGA": 37,00 zł, now 20,67 zł).
const PRODUCT =
  '"type":"digital-product","name":"Teczka","freeOfCharge":false,"price":{"currency":"pln","amount":3700,"icon":null},"prices":[{"id":"68928155e67ca16e78420194","type":"flat-rate","currency":"pln","amount":3700,"interval":null,"intervalCount":null,"totalCycles":null,"title":null,"order":1}]';
const PROMOTION =
  '"promotion":{"discountRate":null,"discountedPrice":2067,"end":null,"purchasesLeft":null,"purchasesLimit":null,"lowestPrice":3700}';
const page = (...parts: string[]) =>
  `<html><script>{${parts.join(",")}}</script></html>`;

describe("a Naffy product's price", () => {
  it("reads a promotion as Naffy shows it", () => {
    const price = parseNaffyPrice(page(PRODUCT, PROMOTION))!;
    expect(price).toEqual({
      regularMinor: 3700,
      discountedMinor: 2067,
      lowestMinor: 3700,
    });
    expect(naffyPriceView(price)).toEqual({
      current: "20,67 zł",
      regular: "37,00 zł",
      lowest: "Najniższa cena z ostatnich 30 dni przed obniżką: 37,00 zł",
      amount: 20.67,
    });
  });

  it("reads the price alone without a promotion", () => {
    const price = parseNaffyPrice(
      page(
        PRODUCT,
        '"promotion":{"discountRate":null,"discountedPrice":null,"end":null,"lowestPrice":null}',
      ),
    )!;
    expect(naffyPriceView(price)).toEqual({
      current: "37,00 zł",
      regular: null,
      lowest: null,
      amount: 37,
    });
  });

  it("drops a promotion that has ended", () => {
    const ended = PROMOTION.replace(
      '"end":null',
      '"end":"2026-10-01T00:00:00.000Z"',
    );
    expect(
      parseNaffyPrice(page(PRODUCT, ended), new Date("2026-10-21"))
        ?.discountedMinor,
    ).toBeNull();
  });

  it("gives no price when it is not sure", () => {
    expect(parseNaffyPrice("<html>nothing here</html>")).toBeNull();
    expect(parseNaffyPrice(page(PRODUCT.replace('"pln"', '"eur"')))).toBeNull();
    expect(
      parseNaffyPrice(
        page(PRODUCT.replace('"freeOfCharge":false', '"freeOfCharge":true')),
      ),
    ).toBeNull();
    expect(
      parseNaffyPrice(
        page(PRODUCT.replace('"type":"flat-rate"', '"type":"recurring"')),
      ),
    ).toBeNull();
  });
});

describe("which links are read", () => {
  it("only a product's page on Naffy", () => {
    expect(
      isNaffyProductUrl(
        "https://www.naffy.io/kolor_sensu/teczka-poczatkujacego-psychologa-HtA",
      ),
    ).toBe(true);
    expect(isNaffyProductUrl("https://naffy.io/kolor_sensu/teczka")).toBe(true);
    expect(isNaffyProductUrl("https://naffy.io")).toBe(false);
    expect(isNaffyProductUrl("http://naffy.io/a/b")).toBe(false);
    expect(isNaffyProductUrl("https://naffy.io.evil.example/a/b")).toBe(false);
    expect(isNaffyProductUrl("https://evil.example/naffy.io/a/b")).toBe(false);
  });
});

describe("fetching the price", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the page, and gives nothing when Naffy fails or sends elsewhere", async () => {
    const url = "https://www.naffy.io/kolor_sensu/teczka";
    const respond = (body: string, at = url, ok = true) =>
      vi.fn().mockResolvedValue({ ok, url: at, text: async () => body });

    vi.stubGlobal("fetch", respond(page(PRODUCT, PROMOTION)));
    expect((await fetchNaffyPrice(url))?.discountedMinor).toBe(2067);

    vi.stubGlobal("fetch", respond("", url, false));
    expect(await fetchNaffyPrice(url)).toBeNull();

    vi.stubGlobal("fetch", respond(page(PRODUCT), "https://evil.example/x"));
    expect(await fetchNaffyPrice(url)).toBeNull();

    const never = vi.fn();
    vi.stubGlobal("fetch", never);
    expect(await fetchNaffyPrice("https://evil.example/a/b")).toBeNull();
    expect(never).not.toHaveBeenCalled();
  });
});
