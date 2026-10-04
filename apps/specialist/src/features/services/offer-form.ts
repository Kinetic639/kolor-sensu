import type { SpecialistServiceUpsert } from "@repo/contracts";
import { z } from "zod";
import type { MyServiceItemViewModel } from "./types";
import { formatPriceInput, parsePriceToMinor } from "./view-model";

function parseDuration(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

/** What the "add / edit service" dialog edits: text inputs plus switches. */
export const offerFormSchema = z
  .object({
    serviceId: z.string().min(1, "Wybierz usługę z katalogu."),
    price: z
      .string()
      .refine(
        (value) => parsePriceToMinor(value) !== null,
        "Podaj cenę, np. 180 lub 180,50.",
      ),
    duration: z.string().refine((value) => {
      const minutes = parseDuration(value);
      return (
        minutes === null ||
        (Number.isInteger(minutes) && minutes >= 15 && minutes <= 300)
      );
    }, "Czas trwania od 15 do 300 minut."),
    supportsInPerson: z.boolean(),
    supportsOnline: z.boolean(),
    active: z.boolean(),
  })
  .refine(
    (data) => !data.active || data.supportsInPerson || data.supportsOnline,
    {
      message: "Aktywna usługa musi mieć co najmniej jedną formę.",
      path: ["supportsInPerson"],
    },
  );

export type OfferFormValues = z.infer<typeof offerFormSchema>;

export function toServiceUpsert(
  values: OfferFormValues,
): SpecialistServiceUpsert {
  return {
    serviceId: values.serviceId,
    priceMinor: parsePriceToMinor(values.price) ?? 0,
    currencyCode: "PLN",
    durationMinutes: parseDuration(values.duration),
    supportsInPerson: values.supportsInPerson,
    supportsOnline: values.supportsOnline,
    active: values.active,
  };
}

export function toOfferFormValues(
  offer: Pick<
    MyServiceItemViewModel,
    | "serviceId"
    | "priceMinor"
    | "durationMinutes"
    | "supportsInPerson"
    | "supportsOnline"
    | "active"
  > | null,
): OfferFormValues {
  if (!offer) {
    return {
      serviceId: "",
      price: "",
      duration: "",
      supportsInPerson: true,
      supportsOnline: false,
      active: true,
    };
  }
  return {
    serviceId: offer.serviceId,
    price: formatPriceInput(offer.priceMinor),
    duration: offer.durationMinutes ? String(offer.durationMinutes) : "",
    supportsInPerson: offer.supportsInPerson,
    supportsOnline: offer.supportsOnline,
    active: offer.active,
  };
}
