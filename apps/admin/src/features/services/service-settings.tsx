"use client";

import { useSave } from "@/lib/use-save";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  durationMinutesSchema,
  serviceCategorySchema,
  type ServiceCategory,
} from "@repo/contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import {
  DETAIL_BUTTON,
  DetailProp,
  DetailProps,
  DetailSection,
} from "@repo/ui/detail-page";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import type { ServiceRow } from "@repo/ui/services";
import { Switch } from "@repo/ui/switch";
import { useOptimistic, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { updateServiceAction } from "./actions";
import { categoryLabels } from "./view-model";

// Ustawienia: where the service is seen (each switch saves at once, and
// says what it does; switching it off asks first), its category and time,
// and where the site's menu has it (arranged with all the services, on
// the offer's list).

type Visibility = "active" | "publiclyVisible" | "bookingEnabled";

const catalogSchema = z.object({
  category: serviceCategorySchema,
  defaultDurationMinutes: durationMinutesSchema,
});
type CatalogValues = z.infer<typeof catalogSchema>;

function VisibilitySwitch({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-[var(--border)] px-3.5 py-2.5 last:border-b-0">
      <span className="text-[0.8125rem] font-semibold text-[var(--text)]">
        {label}
      </span>
      <Switch
        aria-label={label}
        checked={checked}
        className="row-span-2"
        disabled={disabled}
        onCheckedChange={onChange}
        size="sm"
      />
      <span className="text-[0.75rem] text-[var(--text-muted)]">
        {description}
      </span>
    </label>
  );
}

function VisibilitySection({ row }: { row: ServiceRow }) {
  const { isPending, run } = useSave();
  const [state, setState] = useOptimistic({
    active: row.active,
    publiclyVisible: row.publiclyVisible,
    bookingEnabled: row.bookingEnabled,
  });
  const [confirming, setConfirming] = useState(false);
  const save = (field: Visibility, next: boolean) =>
    run(
      async () => {
        setState((now) => ({ ...now, [field]: next }));
        return updateServiceAction(row.id, { [field]: next });
      },
      next ? "Zapisano: włączono" : "Zapisano: wyłączono",
    );

  return (
    <DetailSection title="Widoczność">
      <VisibilitySwitch
        checked={state.active}
        description="Wyłączona znika ze strony i z rezerwacji. Oferty specjalistów i umówione wizyty zostają."
        disabled={isPending}
        label="Aktywna"
        onChange={(next) => (next ? save("active", true) : setConfirming(true))}
      />
      <VisibilitySwitch
        checked={state.publiclyVisible}
        description={`Kafelek w ofercie i strona /oferta/${row.slug}.`}
        disabled={isPending || !state.active}
        label="Na stronie"
        onChange={(next) => save("publiclyVisible", next)}
      />
      <VisibilitySwitch
        checked={state.bookingEnabled}
        description="Klient wybierze ją w „Umów wizytę” u osób, które ją prowadzą."
        disabled={isPending || !state.active}
        label="Rezerwacja online"
        onChange={(next) => save("bookingEnabled", next)}
      />
      <AlertDialog onOpenChange={setConfirming} open={confirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyłączyć usługę?</AlertDialogTitle>
            <AlertDialogDescription>
              „{row.name}” zniknie ze strony i z rezerwacji online, także u
              specjalistów, którzy ją prowadzą. Ich oferty i umówione wizyty
              zostają; usługę można włączyć z powrotem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => save("active", false)}>
              Wyłącz usługę
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DetailSection>
  );
}

function CatalogSection({ row }: { row: ServiceRow }) {
  const { isPending, run } = useSave();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CatalogValues>({
    resolver: zodResolver(catalogSchema),
    defaultValues: {
      category: row.category,
      defaultDurationMinutes: row.durationMinutes,
    },
  });
  return (
    <DetailSection title="Katalog">
      <form
        className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2"
        noValidate
        onSubmit={handleSubmit((values) =>
          run(
            () => updateServiceAction(row.id, values),
            "Zapisano usługę",
            () => reset(values),
          ),
        )}
      >
        <div className="grid content-start gap-1.5">
          <Label htmlFor="service-category">Kategoria</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select
                onValueChange={(value) =>
                  field.onChange(value as ServiceCategory)
                }
                value={field.value}
              >
                <SelectTrigger
                  aria-describedby="service-category-hint"
                  id="service-category"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p
            className="text-[0.75rem] text-[var(--text-muted)]"
            id="service-category-hint"
          >
            Od niej zależy ikona na kafelku.
          </p>
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="service-duration">Domyślny czas (min)</Label>
          <Input
            aria-describedby="service-duration-hint"
            aria-invalid={errors.defaultDurationMinutes ? true : undefined}
            id="service-duration"
            max={300}
            min={15}
            step={5}
            type="number"
            {...register("defaultDurationMinutes", { valueAsNumber: true })}
          />
          <p
            className="text-[0.75rem] text-[var(--text-muted)]"
            id="service-duration-hint"
          >
            {errors.defaultDurationMinutes
              ? "Od 15 do 300 minut."
              : "Specjalista może ustawić własny."}
          </p>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button
            className="h-7 px-2.5 text-[0.8125rem]"
            disabled={!isDirty}
            loading={isPending}
            size="sm"
            type="submit"
          >
            Zapisz
          </Button>
        </div>
      </form>
    </DetailSection>
  );
}

/** Where the site's menu has it; arranged on the offer's list. */
function MenuSection({ row }: { row: ServiceRow }) {
  return (
    <DetailSection
      actions={
        <Link className={DETAIL_BUTTON} href="/oferta?uklad=1">
          <FolderOpen aria-hidden="true" />
          Kolejność i katalogi
        </Link>
      }
      title="W menu „Oferta”"
    >
      <DetailProps>
        <DetailProp label="Katalog">
          {row.catalog ? (
            row.catalog.name
          ) : (
            <span className="text-[var(--text-muted)]">
              bez katalogu · od razu w menu
            </span>
          )}
        </DetailProp>
        <DetailProp label="Na stronie">
          {row.position ? (
            `${row.position}. w ofercie`
          ) : (
            <span className="text-[var(--text-muted)]">
              nie ma jej w menu (nieaktywna albo ukryta)
            </span>
          )}
        </DetailProp>
      </DetailProps>
      <p className="px-3.5 py-2.5 text-[0.75rem] text-[var(--text-muted)]">
        Kolejność i katalogi dotyczą całej oferty, więc układa się je na liście
        usług.
      </p>
    </DetailSection>
  );
}

export function ServiceSettings({ row }: { row: ServiceRow }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--surface)] lg:grid lg:grid-cols-2 lg:overflow-hidden">
      <div className="min-w-0 border-[var(--border)] lg:overflow-y-auto lg:border-r">
        <VisibilitySection row={row} />
        <CatalogSection row={row} />
      </div>
      <div className="min-w-0 lg:overflow-y-auto">
        <MenuSection row={row} />
      </div>
    </div>
  );
}
