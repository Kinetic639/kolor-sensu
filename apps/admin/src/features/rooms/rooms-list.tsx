"use client";

import type {
  AdminRoomSummary,
  Location,
  LocationCreate,
  RoomCreate,
} from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { EmptyState, PageHeader, StatusBadge } from "@repo/ui/portal-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createLocationAction,
  createRoomAction,
  getAdminRoomsPageAction,
  updateLocationAction,
} from "./actions";
import { locationsKeys, roomsKeys } from "./query-keys";
import { LocationForm, RoomForm } from "./resource-forms";

export function RoomsList({
  initialData,
}: {
  initialData: { rooms: AdminRoomSummary[]; locations: Location[] };
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [locationOpen, setLocationOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("all");
  const [status, setStatus] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const query = useQuery({
    queryKey: roomsKeys.lists(),
    queryFn: getAdminRoomsPageAction,
    initialData,
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: roomsKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: locationsKeys.all }),
    ]);
  };
  const mutation = useMutation({
    mutationFn: async (
      operation: () => Promise<{
        ok: boolean;
        message?: string;
        roomId?: string;
      }>,
    ) => operation(),
    onSuccess: async (result) => {
      if (!result.ok)
        return setError(result.message ?? "Nie udało się zapisać zmian.");
      await refresh();
      setError(null);
      setLocationOpen(false);
      setRoomOpen(false);
      setEditingLocation(null);
      toast.success("Zmiany zostały zapisane");
      if (result.roomId) router.push(`/gabinety/${result.roomId}`);
    },
  });
  const rooms = useMemo(
    () =>
      query.data.rooms.filter((room) => {
        const term = search.trim().toLocaleLowerCase("pl");
        return (
          (!term || room.name.toLocaleLowerCase("pl").includes(term)) &&
          (locationId === "all" || room.locationId === locationId) &&
          (status === "all" || room.active === (status === "active")) &&
          (visibility === "all" ||
            room.publiclyVisible === (visibility === "public"))
        );
      }),
    [query.data.rooms, search, locationId, status, visibility],
  );
  const activeLocations = query.data.locations.filter(
    (location) => location.active,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gabinety"
        description="Lokalizacje, zasoby, profile publiczne i dostępność centrum."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setLocationOpen(true)}>
              <Building2 className="size-4" />
              Dodaj lokalizację
            </Button>
            <Button
              disabled={!activeLocations.length}
              onClick={() => setRoomOpen(true)}
            >
              <Plus className="size-4" />
              Dodaj gabinet
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Lokalizacje</CardTitle>
        </CardHeader>
        <CardContent>
          {query.data.locations.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {query.data.locations.map((location) => (
                <button
                  className="rounded-[var(--radius-control)] border border-[var(--border)] p-4 text-left transition hover:border-[var(--accent)]"
                  key={location.id}
                  onClick={() => setEditingLocation(location)}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <strong>{location.name}</strong>
                    <StatusBadge tone={location.active ? "success" : "neutral"}>
                      {location.active ? "Aktywna" : "Nieaktywna"}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {[location.addressLine1, location.postalCode, location.city]
                      .filter(Boolean)
                      .join(", ") || "Brak adresu"}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {location.publiclyVisible
                      ? "Widoczna publicznie"
                      : "Prywatna"}{" "}
                    · Edytuj
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Najpierw dodaj lokalizację"
              description="Gabinet musi należeć do rzeczywistej lokalizacji centrum."
              action={
                <Button onClick={() => setLocationOpen(true)}>
                  Utwórz pierwszą lokalizację
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista gabinetów</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-1">
              <Search className="absolute top-3 left-3 size-4 text-[var(--text-muted)]" />
              <Input
                className="pl-9"
                aria-label="Szukaj gabinetu"
                placeholder="Szukaj..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Filter
              label="Lokalizacja"
              value={locationId}
              onChange={setLocationId}
              options={[
                ["all", "Wszystkie lokalizacje"],
                ...query.data.locations.map((location) => [
                  location.id,
                  location.name,
                ]),
              ]}
            />
            <Filter
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                ["all", "Każdy status"],
                ["active", "Aktywne"],
                ["inactive", "Nieaktywne"],
              ]}
            />
            <Filter
              label="Widoczność"
              value={visibility}
              onChange={setVisibility}
              options={[
                ["all", "Każda widoczność"],
                ["public", "Publiczne"],
                ["private", "Prywatne"],
              ]}
            />
          </div>
          {!query.data.locations.length ? null : !rooms.length ? (
            <EmptyState
              title={
                query.data.rooms.length
                  ? "Brak pasujących gabinetów"
                  : "Brak gabinetów"
              }
              description={
                query.data.rooms.length
                  ? "Zmień wyszukiwanie lub filtry."
                  : "Dodaj pierwszy gabinet w wybranej lokalizacji."
              }
              action={
                !query.data.rooms.length ? (
                  <Button onClick={() => setRoomOpen(true)}>
                    Dodaj gabinet
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
                      <th className="p-3">Gabinet</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Konfiguracja</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => (
                      <RoomRow key={room.id} room={room} />
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-3 md:hidden">
                {rooms.map((room) => (
                  <li
                    key={room.id}
                    className="rounded-[var(--radius-control)] border border-[var(--border)] p-4"
                  >
                    <RoomCard room={room} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={locationOpen || Boolean(editingLocation)}
        onOpenChange={(open) => {
          if (!open) {
            setLocationOpen(false);
            setEditingLocation(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edytuj lokalizację" : "Dodaj lokalizację"}
            </DialogTitle>
            <DialogDescription>
              Adres i widoczność lokalizacji centrum.
            </DialogDescription>
          </DialogHeader>
          <LocationForm
            defaultValues={
              editingLocation ? locationDefaults(editingLocation) : undefined
            }
            pending={mutation.isPending}
            error={error}
            submitLabel="Zapisz lokalizację"
            onSubmit={(values) =>
              mutation.mutate(() =>
                editingLocation
                  ? updateLocationAction(editingLocation.id, values)
                  : createLocationAction(values),
              )
            }
          />
        </DialogContent>
      </Dialog>
      <Dialog open={roomOpen} onOpenChange={setRoomOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj gabinet</DialogTitle>
            <DialogDescription>
              Utwórz fizyczny zasób przypisany do lokalizacji.
            </DialogDescription>
          </DialogHeader>
          <RoomForm
            locations={activeLocations}
            pending={mutation.isPending}
            error={error}
            submitLabel="Utwórz gabinet"
            onSubmit={(values: RoomCreate) =>
              mutation.mutate(() => createRoomAction(values))
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoomRow({ room }: { room: AdminRoomSummary }) {
  return (
    <tr className="border-b border-[var(--border)] last:border-0">
      <td className="p-3">
        <strong>{room.name}</strong>
        <p className="text-xs text-[var(--text-muted)]">
          {room.locationName} · pojemność {room.capacity}
        </p>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-1">
          <StatusBadge tone={room.active ? "success" : "neutral"}>
            {room.active ? "Aktywny" : "Nieaktywny"}
          </StatusBadge>
          <StatusBadge tone={room.publiclyVisible ? "info" : "neutral"}>
            {room.publiclyVisible ? "Publiczny" : "Prywatny"}
          </StatusBadge>
        </div>
      </td>
      <td className="p-3 text-xs text-[var(--text-muted)]">
        {room.publicProfilePublished
          ? "Profil opublikowany"
          : "Profil nieopublikowany"}
        <br />
        {room.hasOpeningHours ? "Godziny ustawione" : "Brak godzin"} ·{" "}
        {room.upcomingExceptionCount} wyjątków
      </td>
      <td className="p-3 text-right">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/gabinety/${room.id}`}>Szczegóły</Link>
        </Button>
      </td>
    </tr>
  );
}
function RoomCard({ room }: { room: AdminRoomSummary }) {
  return (
    <>
      <div className="mb-2">
        <strong>{room.name}</strong>
        <p className="text-sm text-[var(--text-muted)]">
          {room.locationName} · {room.capacity} os.
        </p>
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        <StatusBadge tone={room.active ? "success" : "neutral"}>
          {room.active ? "Aktywny" : "Nieaktywny"}
        </StatusBadge>
        <StatusBadge tone={room.publiclyVisible ? "info" : "neutral"}>
          {room.publiclyVisible ? "Publiczny" : "Prywatny"}
        </StatusBadge>
      </div>
      <p className="mb-3 text-xs text-[var(--text-muted)]">
        {room.hasOpeningHours ? "Godziny ustawione" : "Brak godzin"} ·{" "}
        {room.upcomingExceptionCount} wyjątków
      </p>
      <Button asChild className="w-full" variant="secondary">
        <Link href={`/gabinety/${room.id}`}>Szczegóły</Link>
      </Button>
    </>
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
        {options.map(([optionValue, optionLabel]) => (
          <SelectItem key={optionValue} value={optionValue!}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function locationDefaults(location: Location): LocationCreate {
  return {
    name: location.name,
    slug: location.slug,
    addressLine1: location.addressLine1,
    addressLine2: location.addressLine2,
    postalCode: location.postalCode,
    city: location.city,
    countryCode: location.countryCode,
    active: location.active,
    publiclyVisible: location.publiclyVisible,
    sortOrder: location.sortOrder,
  };
}
