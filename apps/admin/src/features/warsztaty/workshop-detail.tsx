"use client";
import {
  cancelWorkshopAction,
  completeWorkshopAction,
  getAdminWorkshopAction,
  publishWorkshopAction,
  updateWorkshopAction,
} from "./actions";
import { workshopsKeys } from "./query-keys";
import type { WorkshopDetailViewModel, WorkshopFormOptions } from "./types";
import { WorkshopForm } from "./workshop-form";
import {
  WorkshopModalityBadge,
  WorkshopStatusBadge,
} from "@repo/ui/workshop-admin";
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
import { PageHeader } from "@repo/ui/portal-content";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export function WorkshopDetail({
  initialData,
  formOptions,
}: {
  initialData: WorkshopDetailViewModel;
  formOptions: WorkshopFormOptions;
}) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: workshopsKeys.detail(initialData.id),
    queryFn: () => getAdminWorkshopAction(initialData.id),
    initialData,
  });
  const workshop = query.data ?? initialData;

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: workshopsKeys.detail(workshop.id),
        exact: true,
      }),
      queryClient.invalidateQueries({ queryKey: workshopsKeys.lists() }),
    ]);

  const editMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateWorkshopAction>[1]) =>
      updateWorkshopAction(workshop.id, patch),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await invalidate();
      setEditOpen(false);
      toast.success("Warsztat został zaktualizowany");
    },
  });
  const publishMutation = useMutation({
    mutationFn: () => publishWorkshopAction(workshop.id),
    onSuccess: async (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      await invalidate();
      toast.success("Warsztat został opublikowany");
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelWorkshopAction(workshop.id),
    onSuccess: async (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      await invalidate();
      setCancelOpen(false);
      toast.success("Warsztat został odwołany");
    },
  });
  const completeMutation = useMutation({
    mutationFn: () => completeWorkshopAction(workshop.id),
    onSuccess: async (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      await invalidate();
      toast.success("Warsztat oznaczony jako zakończony");
    },
  });

  const defaults = {
    title: workshop.title,
    slug: workshop.slug,
    shortDescription: workshop.shortDescription,
    longDescription: workshop.longDescription,
    specialistId: workshop.specialistId,
    modality: workshop.modality,
    locationId: workshop.locationId,
    roomId: workshop.roomId,
    startsAt: workshop.startsAt,
    endsAt: workshop.endsAt,
    priceMinor: workshop.priceMinor,
    capacity: workshop.capacity,
    registrationEnabled: workshop.registrationEnabled,
    coverImagePath: workshop.coverImagePath,
  };

  return (
    <div className="space-y-6">
      <Button asChild size="sm" variant="ghost">
        <Link href="/warsztaty">
          <ArrowLeft className="size-4" />
          Wróć do warsztatów
        </Link>
      </Button>
      <PageHeader
        eyebrow="Warsztat"
        title={workshop.title}
        description={`${workshop.dateLabel} · ${workshop.timeLabel}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">Edytuj warsztat</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edytuj warsztat</DialogTitle>
                  <DialogDescription>
                    Zmiany zapisują się natychmiast, niezależnie od statusu
                    publikacji.
                  </DialogDescription>
                </DialogHeader>
                <WorkshopForm
                  defaultValues={defaults}
                  error={error}
                  options={formOptions}
                  pending={editMutation.isPending}
                  submitLabel="Zapisz zmiany"
                  onSubmit={(values) => editMutation.mutate(values)}
                />
              </DialogContent>
            </Dialog>
            {workshop.status === "draft" ? (
              <Button
                loading={publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
              >
                Opublikuj
              </Button>
            ) : null}
            {workshop.status === "published" ? (
              <>
                <Button
                  loading={completeMutation.isPending}
                  variant="secondary"
                  onClick={() => completeMutation.mutate()}
                >
                  Oznacz jako zakończony
                </Button>
                <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Odwołaj warsztat</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Odwołać warsztat?</DialogTitle>
                      <DialogDescription>
                        Warsztat zniknie z listy nadchodzących wydarzeń na
                        stronie publicznej, ale jego strona szczegółów
                        pozostanie dostępna z wyraźnym oznaczeniem "Odwołany".
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => setCancelOpen(false)}
                      >
                        Anuluj
                      </Button>
                      <Button
                        variant="destructive"
                        loading={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate()}
                      >
                        Tak, odwołaj warsztat
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}
          </div>
        }
      />
      <div className="flex flex-wrap gap-2">
        <WorkshopStatusBadge status={workshop.status} />
        <WorkshopModalityBadge modality={workshop.modality} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dane wydarzenia</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-[var(--border)]">
              {[
                ["Slug", workshop.slug],
                ["Prowadzący", workshop.specialistName],
                ["Termin", `${workshop.dateLabel}, ${workshop.timeLabel}`],
                ["Lokalizacja", workshop.locationLabel ?? "Brak (online)"],
                ["Gabinet", workshop.roomName ?? "Brak"],
                ["Cena", workshop.priceLabel],
                ["Liczba miejsc", String(workshop.capacity)],
                [
                  "Zapisy",
                  workshop.registrationEnabled
                    ? "Będą dostępne"
                    : "Jeszcze niedostępne",
                ],
                ["Krótki opis", workshop.shortDescription ?? "Brak opisu"],
                ["Opis", workshop.longDescription ?? "Brak opisu"],
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
      </div>
    </div>
  );
}
