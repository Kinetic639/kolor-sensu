"use client";
import { getAdminServiceAction, updateServiceAction } from "./actions";
import { servicesKeys } from "./query-keys";
import type { ServiceDetailViewModel } from "./types";
import { ServiceForm } from "./service-form";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { EmptyState, SectionHeader } from "@repo/ui/portal-content";
import {
  ServiceStatusBadges,
  SpecialistOfferSummary,
} from "@repo/ui/service-admin";
import { Switch } from "@repo/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@repo/ui/toast";

export function ServiceDetail({
  initialData,
}: {
  initialData: ServiceDetailViewModel;
}) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: servicesKeys.detail(initialData.id),
    queryFn: () => getAdminServiceAction(initialData.id),
    initialData,
  });
  const service = query.data ?? initialData;
  const mutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateServiceAction>[1]) =>
      updateServiceAction(service.id, patch),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: servicesKeys.detail(service.id),
          exact: true,
        }),
        queryClient.invalidateQueries({ queryKey: servicesKeys.lists() }),
      ]);
      setEditOpen(false);
      toast.success("Usługa została zaktualizowana");
    },
  });
  const defaults = {
    name: service.name,
    slug: service.slug,
    shortDescription: service.shortDescription,
    description: service.description,
    category: service.category,
    defaultDurationMinutes: Number(service.durationLabel.replace(" min", "")),
    active: service.active,
    publiclyVisible: service.publiclyVisible,
    bookingEnabled: service.bookingEnabled,
    sortOrder: service.sortOrder,
  };
  const toggle = (patch: Parameters<typeof updateServiceAction>[1]) =>
    mutation.mutate(patch);
  return (
    <div className="space-y-6">
      <Button asChild size="sm" variant="ghost">
        <Link href="/oferta">
          <ArrowLeft className="size-4" />
          Wróć do oferty
        </Link>
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-xl leading-tight font-semibold text-[var(--text)]">
            {service.name}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {service.shortDescription ?? "Brak krótkiego opisu"}
          </p>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button>Edytuj usługę</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edytuj usługę</DialogTitle>
              <DialogDescription>
                Cenniki specjalistów pozostają niezależne.
              </DialogDescription>
            </DialogHeader>
            <ServiceForm
              defaultValues={defaults}
              error={error}
              pending={mutation.isPending}
              submitLabel="Zapisz zmiany"
              onSubmit={(values) => mutation.mutate(values)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <ServiceStatusBadges {...service} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dane katalogowe</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-[var(--border)]">
              {[
                ["Slug", service.slug],
                ["Kategoria", service.categoryLabel],
                ["Domyślny czas", service.durationLabel],
                ["Kolejność", String(service.sortOrder)],
                ["Opis", service.description ?? "Brak opisu"],
              ].map(([label, value]) => (
                <div
                  className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"
                  key={label}
                >
                  <dt className="text-sm font-semibold text-[var(--text-muted)]">
                    {label}
                  </dt>
                  <dd className="text-sm whitespace-pre-wrap">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cykl życia</CardTitle>
          </CardHeader>
          <CardContent>
            {[
              ["active", "Usługa aktywna", service.active],
              [
                "publiclyVisible",
                "Widoczna publicznie",
                service.publiclyVisible,
              ],
              ["bookingEnabled", "Dostępna w bookingu", service.bookingEnabled],
            ].map(([key, label, checked]) => (
              <label
                className="flex min-h-14 items-center justify-between gap-4 border-b border-[var(--border)] last:border-0"
                key={String(key)}
              >
                <span className="text-sm font-semibold">{String(label)}</span>
                <Switch
                  aria-label={String(label)}
                  checked={Boolean(checked)}
                  disabled={mutation.isPending}
                  onCheckedChange={(value) => {
                    if (key === "active" && !value) {
                      setDeactivateOpen(true);
                      return;
                    }
                    toggle({ [String(key)]: value });
                  }}
                />
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wyłączyć usługę?</DialogTitle>
            <DialogDescription>
              Wyłączenie usługi spowoduje, że nie będzie dostępna publicznie ani
              w przyszłym bookingu, nawet jeśli specjaliści mają ją aktywną.
              Istniejące oferty nie zostaną usunięte.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeactivateOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              loading={mutation.isPending}
              onClick={() => {
                toggle({ active: false });
                setDeactivateOpen(false);
              }}
            >
              Wyłącz usługę
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Card>
        <SectionHeader
          title="Oferty specjalistów"
          description="Ceny, modalności i nadpisania czasu pozostają danymi specialist_services."
        />
        {service.offers.length ? (
          <ul className="mt-3">
            {service.offers.map((offer) => (
              <SpecialistOfferSummary key={offer.id} {...offer} />
            ))}
          </ul>
        ) : (
          <EmptyState
            className="mt-4"
            title="Nikt jeszcze nie oferuje tej usługi"
            description="Specjaliści będą wybierać usługę z tego katalogu w swoim portalu."
          />
        )}
      </Card>
    </div>
  );
}
