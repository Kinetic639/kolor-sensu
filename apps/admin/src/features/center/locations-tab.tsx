"use client";

import { slugify } from "@/lib/slugify";
import { useSave } from "@/lib/use-save";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Location } from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { DETAIL_BUTTON, DetailSection, ROW_LINE } from "@repo/ui/detail-page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { IconButton } from "@repo/ui/icon-action";
import { TagListField } from "@repo/ui/specialist-profile";
import { Tag } from "@repo/ui/visit-table";
import { MapPin, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { saveLocationAction } from "./actions";
import { Field, SwitchRow } from "./fields";
import {
  locationFormSchema,
  toLocationFormValues,
  type LocationFormValues,
} from "./forms";

// Ustawienia → Lokalizacje: the centre's addresses, one a row (its state
// as tags), each edited in a dialog. Visible ones are on the site's
// Kontakt and Gabinety.

function LocationForm({
  location,
  pending,
  onCancel,
  onSubmit,
}: {
  location: Location | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (values: LocationFormValues) => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getFieldState,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: toLocationFormValues(location),
  });
  const nameField = register("name");

  return (
    <form className="grid gap-3.5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field
          error={errors.name?.message}
          id="location-name"
          label="Nazwa"
          registration={{
            ...nameField,
            onChange: async (event) => {
              await nameField.onChange(event);
              // A new location's slug follows its name until edited by hand.
              if (!location && !getFieldState("slug").isDirty) {
                setValue("slug", slugify(event.target.value));
              }
            },
          }}
        />
        <Field
          error={errors.slug?.message}
          hint="Część adresu strony, np. gabinet-mokotow."
          id="location-slug"
          label="Adres (slug)"
          registration={register("slug")}
        />
        <Field
          error={errors.addressLine1?.message}
          id="location-address-1"
          label="Ulica i numer"
          registration={register("addressLine1")}
        />
        <Field
          error={errors.addressLine2?.message}
          id="location-address-2"
          label="Dodatkowa linia adresu"
          registration={register("addressLine2")}
        />
        <Field
          error={errors.postalCode?.message}
          id="location-postal-code"
          label="Kod pocztowy"
          registration={register("postalCode")}
        />
        <Field
          error={errors.city?.message}
          id="location-city"
          label="Miasto"
          registration={register("city")}
        />
      </div>
      <Field
        error={errors.publicDescription?.message}
        hint="Na stronie Gabinety, nad gabinetami w tej lokalizacji."
        id="location-description"
        label="Opis lokalizacji"
        multiline
        registration={register("publicDescription")}
      />
      <Controller
        control={control}
        name="amenities"
        render={({ field }) => (
          <TagListField
            description="Np. winda, parking, wejście od strony placu, poczekalnia."
            id="location-amenities"
            label="Udogodnienia"
            maxItems={30}
            maxLength={100}
            onChange={field.onChange}
            values={field.value}
          />
        )}
      />
      <Field
        error={errors.accessibilityNotes?.message}
        hint="Np. próg przy wejściu, szerokość drzwi, toaleta dostosowana do potrzeb osób z niepełnosprawnościami."
        id="location-accessibility"
        label="Dostępność"
        multiline
        registration={register("accessibilityNotes")}
      />
      <div className="overflow-hidden rounded-[6px] border border-[var(--border)] [&>label:last-child]:border-b-0">
        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <SwitchRow
              checked={field.value}
              description="Nieaktywnej nie wybiera się przy gabinetach."
              label="Aktywna"
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="publiclyVisible"
          render={({ field }) => (
            <SwitchRow
              checked={field.value}
              description="Adres na stronach Kontakt i Gabinety."
              label="Widoczna na stronie"
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>
      <DialogFooter>
        <Button onClick={onCancel} size="sm" type="button" variant="secondary">
          Anuluj
        </Button>
        <Button loading={pending} size="sm" type="submit">
          {location ? "Zapisz zmiany" : "Dodaj lokalizację"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function address(location: Location) {
  return [
    location.addressLine1,
    location.addressLine2,
    [location.postalCode, location.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

export function LocationsTab({ locations }: { locations: Location[] }) {
  const { isPending, run } = useSave();
  const [editing, setEditing] = useState<Location | "new" | null>(null);
  const current = editing === "new" ? null : editing;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--surface)]">
      <DetailSection
        actions={
          <button
            className={DETAIL_BUTTON}
            onClick={() => setEditing("new")}
            type="button"
          >
            <Plus aria-hidden="true" />
            Dodaj lokalizację
          </button>
        }
        note="widoczne są na stronach Kontakt i Gabinety"
        title="Lokalizacje"
      >
        {locations.length ? (
          <ul>
            {locations.map((location) => (
              <li
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b px-3.5 py-2 last:border-b-0 ${ROW_LINE}`}
                key={location.id}
              >
                <MapPin
                  aria-hidden="true"
                  className="size-4 text-[var(--text-muted)]"
                />
                <div className="grid min-w-0 gap-0.5 sm:flex sm:items-center sm:gap-3">
                  <span className="truncate text-[0.8125rem] font-medium text-[var(--text)]">
                    {location.name}
                  </span>
                  <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
                    {address(location) || "brak adresu"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="hidden flex-wrap gap-1 sm:flex">
                    <Tag tone={location.active ? "success" : "neutral"}>
                      {location.active ? "Aktywna" : "Nieaktywna"}
                    </Tag>
                    <Tag tone={location.publiclyVisible ? "info" : "neutral"}>
                      {location.publiclyVisible ? "Na stronie" : "Ukryta"}
                    </Tag>
                  </span>
                  <IconButton
                    icon={<Pencil aria-hidden="true" />}
                    label={`Edytuj: ${location.name}`}
                    onClick={() => setEditing(location)}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3.5 py-6 text-center text-[0.8125rem] text-[var(--text-muted)]">
            Dodaj adres centrum, aby pokazać go na stronie.
          </p>
        )}
      </DetailSection>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        open={editing !== null}
      >
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {current ? `Edytuj: ${current.name}` : "Dodaj lokalizację"}
            </DialogTitle>
            <DialogDescription>
              Adres i widoczność lokalizacji na stronie.
            </DialogDescription>
          </DialogHeader>
          {editing === null ? null : (
            <LocationForm
              key={current?.id ?? "new"}
              location={current}
              onCancel={() => setEditing(null)}
              onSubmit={(values) =>
                run(
                  () => saveLocationAction(current?.id ?? null, values),
                  current ? "Zapisano lokalizację" : "Dodano lokalizację",
                  () => setEditing(null),
                )
              }
              pending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
