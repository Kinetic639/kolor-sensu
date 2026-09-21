"use client";
import { createWorkshopAction, getAdminWorkshopsAction } from "./actions";
import { workshopsKeys } from "./query-keys";
import type { WorkshopFormOptions, WorkshopsListViewModel } from "./types";
import { WorkshopForm } from "./workshop-form";
import {
  WorkshopModalityBadge,
  WorkshopStatusBadge,
} from "@repo/ui/workshop-admin";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { EmptyState, PageHeader } from "@repo/ui/portal-content";
import { Input } from "@repo/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function WorkshopsList({
  initialData,
  formOptions,
}: {
  initialData: WorkshopsListViewModel;
  formOptions: WorkshopFormOptions;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const filters = {
    search: params.get("q") ?? "",
    status: params.get("status") ?? "all",
    modality: params.get("modality") ?? "all",
    when: params.get("when") ?? "all",
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: workshopsKeys.list(filters),
    queryFn: getAdminWorkshopsAction,
    initialData,
  });
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value && value !== "all" ? next.set(key, value) : next.delete(key);
    router.replace(`/warsztaty${next.size ? `?${next}` : ""}` as Route);
  };
  const now = Date.now();
  const items = useMemo(
    () =>
      query.data.items.filter(
        (item) =>
          (!filters.search ||
            `${item.title} ${item.slug}`
              .toLocaleLowerCase("pl")
              .includes(filters.search.toLocaleLowerCase("pl"))) &&
          (filters.status === "all" || item.status === filters.status) &&
          (filters.modality === "all" || item.modality === filters.modality) &&
          (filters.when === "all" ||
            (filters.when === "upcoming"
              ? new Date(item.startsAt).getTime() > now
              : new Date(item.startsAt).getTime() <= now)),
      ),
    [
      query.data.items,
      filters.search,
      filters.status,
      filters.modality,
      filters.when,
      now,
    ],
  );
  const createMutation = useMutation({
    mutationFn: createWorkshopAction,
    onSuccess: async (result) => {
      if (!result.ok) {
        setCreateError(result.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: workshopsKeys.lists() });
      setCreateOpen(false);
      toast.success("Warsztat został utworzony jako szkic");
      router.push(`/warsztaty/${result.workshopId}`);
    },
  });
  const createButton = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Dodaj warsztat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nowy warsztat</DialogTitle>
          <DialogDescription>
            Warsztat zostanie utworzony jako szkic -- opublikuj go później ze
            strony szczegółów.
          </DialogDescription>
        </DialogHeader>
        <WorkshopForm
          error={createError}
          options={formOptions}
          onSubmit={(values) => createMutation.mutate(values)}
          pending={createMutation.isPending}
          submitLabel="Utwórz warsztat"
        />
      </DialogContent>
    </Dialog>
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Warsztaty"
        description="Wydarzenia grupowe prowadzone przez specjalistów centrum."
        actions={createButton}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Wszystkie", query.data.totalCount],
          ["Opublikowane", query.data.publishedCount],
          ["Szkice", query.data.draftCount],
          ["Nadchodzące", query.data.upcomingCount],
        ].map(([label, value]) => (
          <Card className="p-4" key={label}>
            <p className="text-sm text-[var(--text-muted)]">{label}</p>
            <p className="font-heading mt-1 text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_repeat(3,11rem)]">
          <label className="relative">
            <span className="sr-only">Szukaj warsztatu</span>
            <Search className="absolute top-3 left-3.5 size-4 text-[var(--text-muted)]" />
            <Input
              className="pl-10"
              value={filters.search}
              onChange={(e) => setFilter("q", e.target.value)}
              placeholder="Szukaj po tytule lub slugu"
            />
          </label>
          <Filter
            label="Status"
            value={filters.status}
            onChange={(v) => setFilter("status", v)}
            options={[
              ["all", "Wszystkie statusy"],
              ["draft", "Szkic"],
              ["published", "Opublikowany"],
              ["cancelled", "Odwołany"],
              ["completed", "Zakończony"],
            ]}
          />
          <Filter
            label="Modalność"
            value={filters.modality}
            onChange={(v) => setFilter("modality", v)}
            options={[
              ["all", "Każda modalność"],
              ["in_person", "Stacjonarnie"],
              ["online", "Online"],
            ]}
          />
          <Filter
            label="Termin"
            value={filters.when}
            onChange={(v) => setFilter("when", v)}
            options={[
              ["all", "Wszystkie terminy"],
              ["upcoming", "Nadchodzące"],
              ["past", "Minione"],
            ]}
          />
        </div>
        {items.length === 0 ? (
          <EmptyState
            title={
              query.data.totalCount
                ? "Brak pasujących warsztatów"
                : "Nie dodano jeszcze żadnego warsztatu"
            }
            description={
              query.data.totalCount
                ? "Zmień wyszukiwanie lub filtry."
                : "Dodaj pierwszy warsztat centrum."
            }
            action={
              !query.data.totalCount ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Dodaj warsztat
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="p-3">Warsztat</th>
                    <th className="p-3">Termin</th>
                    <th className="p-3">Prowadzący</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      className="border-b border-[var(--border)] last:border-0"
                      key={item.id}
                    >
                      <td className="p-3">
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.slug} · {item.priceLabel} · {item.capacity}{" "}
                          miejsc
                        </p>
                      </td>
                      <td className="p-3">
                        <p>{item.dateLabel}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.timeLabel}
                        </p>
                      </td>
                      <td className="p-3">{item.specialistName}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <WorkshopStatusBadge status={item.status} />
                          <WorkshopModalityBadge modality={item.modality} />
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/warsztaty/${item.id}`}>Szczegóły</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-3 md:hidden">
              {items.map((item) => (
                <li
                  className="rounded-[var(--radius-control)] border border-[var(--border)] p-4"
                  key={item.id}
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="mb-2 text-sm text-[var(--text-muted)]">
                    {item.dateLabel} · {item.timeLabel}
                  </p>
                  <p className="mb-3 text-sm text-[var(--text-muted)]">
                    {item.specialistName} · {item.priceLabel}
                  </p>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <WorkshopStatusBadge status={item.status} />
                    <WorkshopModalityBadge modality={item.modality} />
                  </div>
                  <Button asChild className="w-full" variant="secondary">
                    <Link href={`/warsztaty/${item.id}`}>Szczegóły</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([value, label]) => (
          <SelectItem key={value} value={value!}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
