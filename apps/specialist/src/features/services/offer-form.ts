import type { SpecialistServiceUpsert } from "@repo/contracts";
import { z } from "zod";
import type { MyServiceItemViewModel } from "./types";
import { formatPriceInput, parsePriceToMinor } from "./view-model";

/**
 * What the "add / edit service" dialog edits: the price and the forms of
 * the visit (its time is the service's, set by the centre).
 */
export const offerFormSchema = z
  .object({
    serviceId: z.string().min(1, "Wybierz usługę z katalogu."),
    price: z
      .string()
      .refine(
        (value) => parsePriceToMinor(value) !== null,
        "Podaj cenę, np. 180 lub 180,50.",
      ),
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
    // The time is the service's (the centre sets it).
    durationMinutes: null,
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
    | "supportsInPerson"
    | "supportsOnline"
    | "active"
  > | null,
): OfferFormValues {
  if (!offer) {
    return {
      serviceId: "",
      price: "",
      supportsInPerson: true,
      supportsOnline: false,
      active: true,
    };
  }
  return {
    serviceId: offer.serviceId,
    price: formatPriceInput(offer.priceMinor),
    supportsInPerson: offer.supportsInPerson,
    supportsOnline: offer.supportsOnline,
    active: offer.active,
  };
}
