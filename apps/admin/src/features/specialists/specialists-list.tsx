"use client";

import { getAdminSpecialistsAction } from "@/features/specialists/actions";
import { specialistsKeys } from "@/features/specialists/query-keys";
import type {
  SpecialistListItemViewModel,
  SpecialistsListViewModel,
} from "@/features/specialists/types";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  StatusBadge,
} from "@repo/ui/portal-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState, type CSSProperties } from "react";

type ActivityFilter = "all" | "active" | "inactive";
type PublicationFilter = "all" | "published" | "pending" | "missing";

function publicationBadge(item: SpecialistListItemViewModel) {
  if (item.pendingDraft) {
    return <StatusBadge tone="warning">Do weryfikacji</StatusBadge>;
  }
  if (item.publicationStatus === "published") {
    return <StatusBadge tone="success">Opublikowany</StatusBadge>;
  }
  if (item.publicationStatus === "rejected") {
    return <StatusBadge tone="danger">Odrzucony</StatusBadge>;
  }
  if (item.publicationStatus === "draft") {
    return <StatusBadge tone="neutral">Szkic</StatusBadge>;
  }
  return <StatusBadge tone="neutral">Brak profilu</StatusBadge>;
}

function SpecialistIdentity({ item }: { item: SpecialistListItemViewModel }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* A ring in the specialist's colour, as in the schedules. */}
      <Avatar
        className="ring-2 ring-[var(--specialist-accent)] ring-offset-2 ring-offset-[var(--surface)]"
        style={{ "--specialist-accent": item.accent } as CSSProperties}
      >
        {item.avatarUrl ? <AvatarImage alt="" src={item.avatarUrl} /> : null}
        <AvatarFallback>{item.initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--text)]">
          {item.displayName}
        </p>
        <p className="truncate text-sm text-[var(--text-muted)]">
          {item.professionalTitle}
        </p>
      </div>
    </div>
  );
}

export function SpecialistsList({
  initialData,
}: {
  initialData: SpecialistsListViewModel;
}) {
  const [search, setSearch] = useState("");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [publication, setPublication] = useState<PublicationFilter>("all");
  const deferredSearch = useDeferredValue(
    search.trim().toLocaleLowerCase("pl"),
  );
  const query = useQuery({
    queryKey: specialistsKeys.lists(),
    queryFn: getAdminSpecialistsAction,
    initialData,
  });

  const filteredItems = useMemo(
    () =>
      query.data.items.filter((item) => {
        const operationallyActive = item.active && item.accountActive;
        const matchesSearch =
          !deferredSearch ||
          `${item.displayName} ${item.professionalTitle}`
            .toLocaleLowerCase("pl")
            .includes(deferredSearch);
        const matchesActivity =
          activity === "all" ||
          (activity === "active" && operationallyActive) ||
          (activity === "inactive" && !operationallyActive);
        const matchesPublication =
          publication === "all" ||
          (publication === "published" &&
            item.publicationStatus === "published" &&
            !item.pendingDraft) ||
          (publication === "pending" && item.pendingDraft) ||
          (publication === "missing" && !item.publicationStatus);
        return matchesSearch && matchesActivity && matchesPublication;
      }),
    [activity, deferredSearch, publication, query.data.items],
  );

  if (query.isError) {
    return (
      <ErrorState
        action={
          <Button onClick={() => query.refetch()}>Spróbuj ponownie</Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Specjaliści"
        description="Zespół, profile publiczne, usługi i statusy współpracy."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)]">Wszyscy</p>
          <p className="font-heading mt-1 text-3xl font-semibold text-[var(--text)]">
            {query.data.totalCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)]">Aktywni</p>
          <p className="font-heading mt-1 text-3xl font-semibold text-[var(--success)]">
            {query.data.activeCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)]">Do weryfikacji</p>
          <p className="font-heading mt-1 text-3xl font-semibold text-[var(--warning-foreground)]">
            {query.data.pendingReviewCount}
          </p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(15rem,1fr)_13rem_13rem]">
          <label className="relative block">
            <span className="sr-only">Szukaj specjalisty</span>
            <Search
              className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <Input
              className="pl-10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Szukaj po imieniu lub specjalizacji"
              value={search}
            />
          </label>
          <Select
            value={activity}
            onValueChange={(value) => setActivity(value as ActivityFilter)}
          >
            <SelectTrigger aria-label="Filtr statusu współpracy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              <SelectItem value="active">Aktywni</SelectItem>
              <SelectItem value="inactive">Nieaktywni</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={publication}
            onValueChange={(value) =>
              setPublication(value as PublicationFilter)
            }
          >
            <SelectTrigger aria-label="Filtr publikacji profilu">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie profile</SelectItem>
              <SelectItem value="published">Opublikowane</SelectItem>
              <SelectItem value="pending">Do weryfikacji</SelectItem>
              <SelectItem value="missing">Bez profilu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState
            title="Brak pasujących specjalistów"
            description="Zmień wyszukiwanie lub wybrane filtry."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="px-3 py-3 font-semibold">Specjalista</th>
                    <th className="px-3 py-3 font-semibold">Współpraca</th>
                    <th className="px-3 py-3 font-semibold">Profil</th>
                    <th className="px-3 py-3 font-semibold">Usługi</th>
                    <th className="px-3 py-3">
                      <span className="sr-only">Akcje</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      className="border-b border-[var(--border)] last:border-0"
                      key={item.id}
                    >
                      <td className="px-3 py-4">
                        <SpecialistIdentity item={item} />
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge
                          tone={
                            item.active && item.accountActive
                              ? "success"
                              : "danger"
                          }
                        >
                          {item.active && item.accountActive
                            ? "Aktywny"
                            : "Nieaktywny"}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-4">{publicationBadge(item)}</td>
                      <td className="px-3 py-4">
                        <Badge variant="neutral">{item.serviceCount}</Badge>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/specjalisci/${item.id}`}>
                            Szczegóły{" "}
                            <ArrowRight className="size-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {filteredItems.map((item) => (
                <li
                  className="rounded-[var(--radius-control)] border border-[var(--border)] p-4"
                  key={item.id}
                >
                  <SpecialistIdentity item={item} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge
                      tone={
                        item.active && item.accountActive ? "success" : "danger"
                      }
                    >
                      {item.active && item.accountActive
                        ? "Aktywny"
                        : "Nieaktywny"}
                    </StatusBadge>
                    {publicationBadge(item)}
                    <Badge variant="neutral">{item.serviceCount} usług</Badge>
                  </div>
                  <Button asChild className="mt-4 w-full" variant="secondary">
                    <Link href={`/specjalisci/${item.id}`}>
                      Zobacz szczegóły
                    </Link>
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
