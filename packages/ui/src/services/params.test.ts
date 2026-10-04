import { describe, expect, it } from "vitest";
import {
  durationsLabel,
  loadServiceListParams,
  priceRange,
  serviceReadiness,
  serviceSegments,
  servicesWeekSummary,
  serviceStatus,
  shownServices,
  sitePrice,
} from "./params";
import { SAMPLE_SERVICES } from "./services.samples";
import type { ServiceRow } from "./types";

const [consultation, therapy, couples, children, assessment] =
  SAMPLE_SERVICES as [
    ServiceRow,
    ServiceRow,
    ServiceRow,
    ServiceRow,
    ServiceRow,
  ];
const params = (query = "") =>
  loadServiceListParams(new URLSearchParams(query));

describe("serviceStatus", () => {
  it("on and on the site: whether it is booked online", () => {
    expect(serviceStatus(consultation)).toEqual({
      tone: "free",
      title: "Aktywna · na stronie",
      detail: "Z rezerwacją online",
    });
    expect(serviceStatus({ ...consultation, bookingEnabled: false })).toEqual({
      tone: "free",
      title: "Aktywna · na stronie",
      detail: "Bez rezerwacji online",
    });
  });

  it("warns when nobody leads it (switched-off offers lead nothing)", () => {
    const warning = {
      tone: "warn",
      title: "Aktywna · na stronie",
      detail: "Nikt jej nie prowadzi · nie da się zarezerwować",
    };
    expect(serviceStatus({ ...therapy, offers: [] })).toEqual(warning);
    expect(
      serviceStatus({
        ...therapy,
        offers: therapy.offers.map((one) => ({ ...one, active: false })),
      }),
    ).toEqual(warning);
  });

  it("hidden on the site, or off: away from the menu and the booking", () => {
    expect(serviceStatus({ ...consultation, publiclyVisible: false })).toEqual({
      tone: "later",
      title: "Aktywna · ukryta na stronie",
      detail: "Nie ma jej na stronie, w menu ani w rezerwacji",
    });
    expect(serviceStatus(assessment)).toEqual({
      tone: "off",
      title: "Nieaktywna",
      detail: "Nie ma jej na stronie, w menu ani w rezerwacji",
    });
  });
});

describe("prices and durations", () => {
  it("the active offers' prices, as a range or one", () => {
    expect(priceRange(consultation.offers)).toBe("200–220 zł");
    expect(priceRange(children.offers)).toBe("180 zł");
    expect(priceRange([])).toBeNull();
  });

  it("the price as the site's page says it", () => {
    expect(sitePrice(consultation.offers)).toBe("od 200 zł");
    expect(sitePrice(children.offers)).toBe("180 zł");
    expect(sitePrice([])).toBeNull();
  });

  it("the times the active offers take, else the service's", () => {
    expect(durationsLabel(consultation)).toBe("50 min");
    expect(durationsLabel(therapy)).toBe("50 / 60 min");
    expect(durationsLabel(assessment)).toBe("90 min");
  });
});

describe("serviceReadiness", () => {
  it("what the site and the booking need, each checked", () => {
    expect(
      serviceReadiness(therapy).map((item) => [item.key, item.ok]),
    ).toEqual([
      ["aktywna", true],
      ["widoczna", true],
      ["prowadzi", true],
      ["opis", true],
    ]);
    const missing = serviceReadiness({ ...assessment, publiclyVisible: false });
    expect(missing.every((item) => !item.ok)).toBe(true);
    expect(missing.at(-1)!.detail).toBe("Kafelek pokaże samą nazwę");
  });
});

describe("the list", () => {
  it("searches, filters a segment and sorts", () => {
    const names = (query: string) =>
      shownServices(SAMPLE_SERVICES, params(query)).map((one) => one.name);
    expect(names("")).toEqual([
      "Konsultacja psychologiczna",
      "Psychoterapia indywidualna",
      "Terapia dla par",
      "Wsparcie dla dzieci i młodzieży",
      "Diagnoza psychologiczna",
    ]);
    expect(names("?q=terapia")).toEqual([
      "Psychoterapia indywidualna",
      "Terapia dla par",
    ]);
    // The catalogue's name finds its services.
    expect(names("?q=terapie")).toEqual([
      "Psychoterapia indywidualna",
      "Terapia dla par",
    ]);
    expect(names("?stan=nieaktywne")).toEqual(["Diagnoza psychologiczna"]);
    expect(names("?sort=wizyty")[0]).toBe("Psychoterapia indywidualna");
    expect(names("?sort=cena")[0]).toBe("Wsparcie dla dzieci i młodzieży");
    // Without a price, last.
    expect(names("?sort=cena").at(-1)).toBe("Diagnoza psychologiczna");
  });

  it("the segments with their counts, the empty ones left out", () => {
    expect(
      serviceSegments("/oferta", params(), SAMPLE_SERVICES).map((one) => [
        one.label,
        one.count,
      ]),
    ).toEqual([
      ["Wszystkie", 5],
      ["Na stronie", 4],
      ["Nieaktywne", 1],
    ]);
    const hidden = { ...couples, publiclyVisible: false };
    const leaderless = { ...children, offers: [] };
    expect(
      serviceSegments("/oferta", params(), [hidden, leaderless]).map((one) => [
        one.label,
        one.count,
      ]),
    ).toEqual([
      ["Wszystkie", 2],
      ["Na stronie", 1],
      ["Ukryte na stronie", 1],
      ["Do uwagi", 1],
    ]);
    expect(
      serviceSegments("/oferta", params("?stan=nieaktywne"), [couples]).map(
        (one) => one.label,
      ),
    ).toEqual(["Wszystkie", "Na stronie", "Nieaktywne"]);
  });

  it("sums the week up in a line", () => {
    expect(servicesWeekSummary(SAMPLE_SERVICES)).toBe(
      "5 usług · 7 ofert specjalistów · 15 wizyt w tygodniu",
    );
  });
});
