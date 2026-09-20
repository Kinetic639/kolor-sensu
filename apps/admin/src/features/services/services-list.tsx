"use client";
import { createServiceAction, getAdminServicesAction } from "./actions";
import { servicesKeys } from "./query-keys";
import type { ServicesListViewModel } from "./types";
import { ServiceForm } from "./service-form";
import { ServiceStatusBadges } from "@repo/ui/service-admin";
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

export function ServicesList({
  initialData,
}: {
  initialData: ServicesListViewModel;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const filters = {
    search: params.get("q") ?? "",
    category: params.get("category") ?? "all",
    status: params.get("status") ?? "all",
    visibility: params.get("visibility") ?? "all",
    booking: params.get("booking") ?? "all",
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: servicesKeys.list(filters),
    queryFn: getAdminServicesAction,
    initialData,
  });
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value && value !== "all" ? next.set(key, value) : next.delete(key);
    router.replace(`/oferta${next.size ? `?${next}` : ""}` as Route);
  };
  const items = useMemo(
    () =>
      query.data.items.filter(
        (item) =>
          (!filters.search ||
            `${item.name} ${item.slug}`
              .toLocaleLowerCase("pl")
              .includes(filters.search.toLocaleLowerCase("pl"))) &&
          (filters.category === "all" || item.category === filters.category) &&
          (filters.status === "all" ||
            item.active === (filters.status === "active")) &&
          (filters.visibility === "all" ||
            item.publiclyVisible === (filters.visibility === "public")) &&
          (filters.booking === "all" ||
            item.bookingEnabled === (filters.booking === "enabled")),
      ),
    [
      query.data.items,
      filters.search,
      filters.category,
      filters.status,
      filters.visibility,
      filters.booking,
    ],
  );
  const createMutation = useMutation({
    mutationFn: createServiceAction,
    onSuccess: async (result) => {
      if (!result.ok) {
        setCreateError(result.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: servicesKeys.lists() });
      setCreateOpen(false);
      toast.success("Usługa została utworzona");
      router.push(`/oferta/${result.serviceId}`);
    },
  });
  const createButton = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Dodaj usługę
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nowa usługa</DialogTitle>
          <DialogDescription>
            Dodaj usługę do globalnego katalogu centrum.
          </DialogDescription>
        </DialogHeader>
        <ServiceForm
          error={createError}
          onSubmit={(values) => createMutation.mutate(values)}
          pending={createMutation.isPending}
          submitLabel="Utwórz usługę"
        />
      </DialogContent>
    </Dialog>
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Oferta"
        description="Globalny katalog usług centrum."
        actions={createButton}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Wszystkie", query.data.totalCount],
          ["Aktywne", query.data.activeCount],
          ["Publiczne", query.data.publicCount],
          ["Booking", query.data.bookingCount],
        ].map(([label, value]) => (
          <Card className="p-4" key={label}>
            <p className="text-sm text-[var(--text-muted)]">{label}</p>
            <p className="font-heading mt-1 text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_repeat(4,11rem)]">
          <label className="relative">
            <span className="sr-only">Szukaj usługi</span>
            <Search className="absolute top-3 left-3.5 size-4 text-[var(--text-muted)]" />
            <Input
              className="pl-10"
              value={filters.search}
              onChange={(e) => setFilter("q", e.target.value)}
              placeholder="Szukaj po nazwie lub slugu"
            />
          </label>
          <Filter
            label="Kategoria"
            value={filters.category}
            onChange={(v) => setFilter("category", v)}
            options={[
              ["all", "Wszystkie kategorie"],
              ["consultation", "Konsultacja"],
              ["psychotherapy", "Psychoterapia"],
              ["couples_therapy", "Terapia par"],
              ["assessment", "Diagnoza"],
              ["workshop_related", "Warsztaty"],
              ["other", "Inne"],
            ]}
          />
          <Filter
            label="Status"
            value={filters.status}
            onChange={(v) => setFilter("status", v)}
            options={[
              ["all", "Wszystkie statusy"],
              ["active", "Aktywne"],
              ["inactive", "Nieaktywne"],
            ]}
          />
          <Filter
            label="Widoczność"
            value={filters.visibility}
            onChange={(v) => setFilter("visibility", v)}
            options={[
              ["all", "Każda widoczność"],
              ["public", "Publiczne"],
              ["private", "Prywatne"],
            ]}
          />
          <Filter
            label="Booking"
            value={filters.booking}
            onChange={(v) => setFilter("booking", v)}
            options={[
              ["all", "Każdy booking"],
              ["enabled", "Włączony"],
              ["disabled", "Wyłączony"],
            ]}
          />
        </div>
        {items.length === 0 ? (
          <EmptyState
            title={
              query.data.totalCount
                ? "Brak pasujących usług"
                : "Katalog usług jest pusty"
            }
            description={
              query.data.totalCount
                ? "Zmień wyszukiwanie lub filtry."
                : "Dodaj pierwszą usługę do katalogu centrum."
            }
            action={
              !query.data.totalCount ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Dodaj usługę
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
                    <th className="p-3">Usługa</th>
                    <th className="p-3">Kategoria</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Specjaliści</th>
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
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.slug} · {item.durationLabel}
                        </p>
                      </td>
                      <td className="p-3">{item.categoryLabel}</td>
                      <td className="p-3">
                        <ServiceStatusBadges {...item} />
                      </td>
                      <td className="p-3">{item.specialistOfferCount}</td>
                      <td className="p-3 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/oferta/${item.id}`}>Szczegóły</Link>
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
                  <p className="font-semibold">{item.name}</p>
                  <p className="mb-3 text-sm text-[var(--text-muted)]">
                    {item.categoryLabel} · {item.durationLabel} ·{" "}
                    {item.specialistOfferCount} specjalistów
                  </p>
                  <ServiceStatusBadges {...item} />
                  <Button asChild className="mt-4 w-full" variant="secondary">
                    <Link href={`/oferta/${item.id}`}>Szczegóły</Link>
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
