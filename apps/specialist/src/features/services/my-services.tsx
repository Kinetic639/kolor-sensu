"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  EmptyState,
  MetricCard,
  PageTitle,
  SectionHeader,
} from "@repo/ui/portal-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { SpecialistOfferRow } from "@repo/ui/specialist-admin";
import { Switch } from "@repo/ui/switch";
import { BriefcaseBusiness, Coins, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "@repo/ui/toast";
import { saveMyServiceAction } from "./actions";
import {
  offerFormSchema,
  toOfferFormValues,
  toServiceUpsert,
  type OfferFormValues,
} from "./offer-form";
import type { MyServiceItemViewModel, MyServicesViewModel } from "./types";

type DialogState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; offer: MyServiceItemViewModel };

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-sm text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

function OfferForm({
  model,
  offer,
  pending,
  onCancel,
  onSubmit,
}: {
  model: MyServicesViewModel;
  offer: MyServiceItemViewModel | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (values: OfferFormValues) => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: toOfferFormValues(offer),
  });
  const serviceId = watch("serviceId");
  const defaultDuration = offer
    ? offer.defaultDurationMinutes
    : model.addableServices.find((service) => service.id === serviceId)
        ?.defaultDurationMinutes;

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      {offer ? null : (
        <div className="space-y-1.5">
          <Label htmlFor="offer-service">Usługa z katalogu</Label>
          <Controller
            control={control}
            name="serviceId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  aria-describedby="offer-service-error"
                  aria-invalid={errors.serviceId ? true : undefined}
                  id="offer-service"
                >
                  <SelectValue placeholder="Wybierz usługę" />
                </SelectTrigger>
                <SelectContent>
                  {model.addableServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError
            id="offer-service-error"
            message={errors.serviceId?.message}
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="offer-price">Cena (zł)</Label>
          <Input
            aria-describedby="offer-price-error"
            aria-invalid={errors.price ? true : undefined}
            id="offer-price"
            inputMode="decimal"
            placeholder="np. 180"
            {...register("price")}
          />
          <FieldError id="offer-price-error" message={errors.price?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="offer-duration">Czas trwania (min)</Label>
          <Input
            aria-describedby="offer-duration-hint offer-duration-error"
            aria-invalid={errors.duration ? true : undefined}
            id="offer-duration"
            inputMode="numeric"
            placeholder={defaultDuration ? String(defaultDuration) : "np. 50"}
            {...register("duration")}
          />
          <p
            className="text-xs text-[var(--text-muted)]"
            id="offer-duration-hint"
          >
            {defaultDuration
              ? `Puste pole = domyślnie ${defaultDuration} min z katalogu.`
              : "Puste pole = czas z katalogu."}
          </p>
          <FieldError
            id="offer-duration-error"
            message={errors.duration?.message}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["supportsInPerson", "Stacjonarnie"],
            ["supportsOnline", "Online"],
            ["acceptingNewClients", "Przyjmuję nowych klientów"],
            ["active", "Usługa aktywna"],
          ] as const
        ).map(([name, label]) => (
          <Controller
            control={control}
            key={name}
            name={name}
            render={({ field }) => (
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm">
                <span>{label}</span>
                <Switch
                  aria-label={label}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </label>
            )}
          />
        ))}
      </div>
      <FieldError
        id="offer-forms-error"
        message={errors.supportsInPerson?.message}
      />
      <DialogFooter>
        <Button onClick={onCancel} variant="secondary">
          Anuluj
        </Button>
        <Button loading={pending} type="submit">
          {offer ? "Zapisz zmiany" : "Dodaj usługę"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MyServices({ model }: { model: MyServicesViewModel }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canAdd = model.addableServices.length > 0;

  function save(
    values: OfferFormValues,
    { offerId, success }: { offerId?: string; success: string },
  ) {
    setPendingOfferId(offerId ?? null);
    startTransition(async () => {
      const result = await saveMyServiceAction(toServiceUpsert(values));
      setPendingOfferId(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setDialog({ mode: "closed" });
      toast.success(success);
      router.refresh();
    });
  }

  const addButton = (
    <Button disabled={!canAdd} onClick={() => setDialog({ mode: "add" })}>
      <Plus className="size-4" aria-hidden="true" />
      Dodaj usługę z katalogu
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageTitle>Moje usługi i stawki</PageTitle>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          detail={`z ${model.totalCount} wszystkich`}
          icon={BriefcaseBusiness}
          label="Aktywne usługi"
          tone="mint"
          value={model.activeCount}
        />
        <MetricCard
          detail={
            model.averageDurationLabel
              ? `średnio za ${model.averageDurationLabel}`
              : "Brak aktywnych usług"
          }
          icon={Coins}
          label="Średnia stawka"
          tone="lilac"
          value={model.averagePriceLabel ?? "—"}
        />
      </div>

      <Card>
        <SectionHeader
          action={model.items.length ? addButton : undefined}
          description="Cena, czas i forma są widoczne na stronie przy Twoim profilu i w cenniku."
          title="Twoje usługi"
        />
        {model.items.length ? (
          <ul className="mt-3">
            {model.items.map((offer) => (
              <SpecialistOfferRow
                acceptingNewClients={offer.acceptingNewClients}
                active={offer.active}
                description={offer.description}
                durationLabel={offer.durationLabel}
                key={offer.id}
                onAcceptingNewClientsChange={(acceptingNewClients) =>
                  save(
                    { ...toOfferFormValues(offer), acceptingNewClients },
                    {
                      offerId: offer.id,
                      success: acceptingNewClients
                        ? "Przyjmujesz nowych klientów"
                        : "Nie przyjmujesz nowych klientów",
                    },
                  )
                }
                onEdit={() => setDialog({ mode: "edit", offer })}
                pending={isPending && pendingOfferId === offer.id}
                priceLabel={offer.priceLabel}
                serviceName={offer.serviceName}
                supportsInPerson={offer.supportsInPerson}
                supportsOnline={offer.supportsOnline}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            action={addButton}
            className="mt-4"
            description="Dodaj usługi z katalogu centrum i ustal swoje ceny."
            title="Nie masz jeszcze usług"
          />
        )}
      </Card>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setDialog({ mode: "closed" });
        }}
        open={dialog.mode !== "closed"}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "edit"
                ? `Edytuj: ${dialog.offer.serviceName}`
                : "Dodaj usługę z katalogu"}
            </DialogTitle>
            <DialogDescription>
              Ustal cenę, czas trwania i formę spotkań.
            </DialogDescription>
          </DialogHeader>
          {dialog.mode === "closed" ? null : (
            <OfferForm
              key={dialog.mode === "edit" ? dialog.offer.id : "new"}
              model={model}
              offer={dialog.mode === "edit" ? dialog.offer : null}
              onCancel={() => setDialog({ mode: "closed" })}
              onSubmit={(values) =>
                save(values, {
                  success:
                    dialog.mode === "edit"
                      ? "Zapisano zmiany w usłudze"
                      : "Dodano usługę",
                })
              }
              pending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
