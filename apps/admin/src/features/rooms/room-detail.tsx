"use client";

import type {
  Location,
  RoomAvailabilityExceptionCreate,
  RoomCreate,
  RoomOpeningHoursIntervalInput,
  RoomPublicProfileInput,
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
import { EmptyState, PageHeader, StatusBadge } from "@repo/ui/portal-content";
import { Switch } from "@repo/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AvailabilityExceptions } from "./availability-exceptions";
import {
  createRoomAvailabilityExceptionAction,
  getAdminRoomDetailAction,
  removeRoomAvailabilityExceptionAction,
  replaceRoomOpeningHoursAction,
  updateRoomAction,
  updateRoomAvailabilityExceptionAction,
  updateRoomPublicProfileAction,
} from "./actions";
import { roomsKeys } from "./query-keys";
import { RoomPublicProfileForm } from "./room-public-profile-form";
import { RoomForm } from "./resource-forms";
import { WeeklyOpeningHoursEditor } from "./weekly-opening-hours-editor";

type RoomDetailData = NonNullable<
  Awaited<ReturnType<typeof getAdminRoomDetailAction>>
>;
type ActionResult = { ok: boolean; message?: string };

export function RoomDetail({ initialData }: { initialData: RoomDetailData }) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: roomsKeys.detail(initialData.room.id),
    queryFn: () => getAdminRoomDetailAction(initialData.room.id),
    initialData,
  });
  const data = query.data ?? initialData;
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<ActionResult>) => operation(),
    onSuccess: async (result) => {
      if (!result.ok)
        return setError(result.message ?? "Nie udało się zapisać zmian.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: roomsKeys.detail(data.room.id),
        }),
        queryClient.invalidateQueries({ queryKey: roomsKeys.lists() }),
      ]);
      setError(null);
      setEditOpen(false);
      toast.success("Zmiany zostały zapisane");
    },
  });
  const roomDefaults: RoomCreate = {
    locationId: data.room.locationId,
    name: data.room.name,
    slug: data.room.slug,
    description: data.room.description,
    active: data.room.active,
    publiclyVisible: data.room.publiclyVisible,
    capacity: data.room.capacity,
    sortOrder: data.room.sortOrder,
  };
  const profileDefaults: RoomPublicProfileInput = data.publicProfile ?? {
    displayName: data.room.name,
    shortDescription: null,
    longDescription: null,
    imagePath: null,
    accessibilityNotes: null,
    amenities: [],
    published: false,
  };

  return (
    <div className="space-y-6">
      <Button asChild size="sm" variant="ghost">
        <Link href="/gabinety">
          <ArrowLeft className="size-4" />
          Wróć do gabinetów
        </Link>
      </Button>
      <PageHeader
        eyebrow={data.room.locationName}
        title={data.room.name}
        description={data.room.description ?? "Brak opisu wewnętrznego"}
        actions={
          <Button onClick={() => setEditOpen(true)}>Edytuj gabinet</Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={data.room.active ? "success" : "neutral"}>
          {data.room.active ? "Aktywny" : "Nieaktywny"}
        </StatusBadge>
        <StatusBadge tone={data.room.publiclyVisible ? "info" : "neutral"}>
          {data.room.publiclyVisible ? "Publiczny" : "Prywatny"}
        </StatusBadge>
        <StatusBadge
          tone={data.publicProfile?.published ? "success" : "neutral"}
        >
          {data.publicProfile?.published
            ? "Profil opublikowany"
            : "Profil nieopublikowany"}
        </StatusBadge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Podgląd</TabsTrigger>
          <TabsTrigger value="public">Profil publiczny</TabsTrigger>
          <TabsTrigger value="hours">Godziny otwarcia</TabsTrigger>
          <TabsTrigger value="availability">Dostępność</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-5">
          <Overview
            data={data}
            pending={mutation.isPending}
            onToggle={(patch) => {
              if (patch.active === false) setDeactivateOpen(true);
              else mutation.mutate(() => updateRoomAction(data.room.id, patch));
            }}
          />
        </TabsContent>
        <TabsContent value="public" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Profil publiczny</CardTitle>
            </CardHeader>
            <CardContent>
              <RoomPublicProfileForm
                defaultValues={profileDefaults}
                pending={mutation.isPending}
                error={error}
                onSubmit={(values) =>
                  mutation.mutate(() =>
                    updateRoomPublicProfileAction(data.room.id, values),
                  )
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="hours" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Tygodniowe godziny otwarcia</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyOpeningHoursEditor
                initialIntervals={data.openingHours}
                pending={mutation.isPending}
                error={error}
                onSave={(intervals: RoomOpeningHoursIntervalInput[]) =>
                  mutation.mutate(() =>
                    replaceRoomOpeningHoursAction(data.room.id, intervals),
                  )
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="availability" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Wyjątki dostępności zasobu</CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityExceptions
                roomId={data.room.id}
                items={data.availabilityExceptions}
                pending={mutation.isPending}
                error={error}
                onCreate={(value: RoomAvailabilityExceptionCreate) =>
                  mutation.mutate(() =>
                    createRoomAvailabilityExceptionAction(value),
                  )
                }
                onUpdate={(id, value) =>
                  mutation.mutate(() =>
                    updateRoomAvailabilityExceptionAction(id, value),
                  )
                }
                onRemove={(id) =>
                  mutation.mutate(() =>
                    removeRoomAvailabilityExceptionAction(id, data.room.id),
                  )
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edytuj gabinet</DialogTitle>
            <DialogDescription>
              Dane operacyjne zasobu pozostają niezależne od profilu
              publicznego.
            </DialogDescription>
          </DialogHeader>
          <RoomForm
            locations={data.locations.filter(
              (location: Location) =>
                location.active || location.id === data.room.locationId,
            )}
            defaultValues={roomDefaults}
            pending={mutation.isPending}
            error={error}
            submitLabel="Zapisz gabinet"
            onSubmit={(values) =>
              mutation.mutate(() => updateRoomAction(data.room.id, values))
            }
          />
        </DialogContent>
      </Dialog>
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wyłączyć gabinet?</DialogTitle>
            <DialogDescription>
              Gabinet przestanie być aktywnym zasobem. Profil i konfiguracja
              pozostaną zachowane.
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
                setDeactivateOpen(false);
                mutation.mutate(() =>
                  updateRoomAction(data.room.id, { active: false }),
                );
              }}
            >
              Wyłącz gabinet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Overview({
  data,
  pending,
  onToggle,
}: {
  data: RoomDetailData;
  pending: boolean;
  onToggle: (patch: { active?: boolean; publiclyVisible?: boolean }) => void;
}) {
  const weeklyDays = new Set(
    data.openingHours.map((interval) => interval.weekday),
  ).size;
  const upcoming = data.availabilityExceptions.filter(
    (item) => item.date >= new Date().toISOString().slice(0, 10),
  );
  const lifecycle = [
    ["active", "Gabinet aktywny", data.room.active],
    [
      "publiclyVisible",
      "Dozwolona ekspozycja publiczna",
      data.room.publiclyVisible,
    ],
  ] as const;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dane operacyjne</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-[var(--border)]">
            {[
              ["Lokalizacja", data.room.locationName],
              ["Slug", data.room.slug],
              ["Pojemność", String(data.room.capacity)],
              ["Kolejność", String(data.room.sortOrder)],
              ["Opis wewnętrzny", data.room.description ?? "Brak opisu"],
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
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Cykl życia</CardTitle>
          </CardHeader>
          <CardContent>
            {lifecycle.map(([key, label, checked]) => (
              <label
                className="flex min-h-14 items-center justify-between gap-4 border-b border-[var(--border)] last:border-0"
                key={key}
              >
                <span className="text-sm font-semibold">{label}</span>
                <Switch
                  checked={checked}
                  disabled={pending}
                  onCheckedChange={(value) => onToggle({ [key]: value })}
                  aria-label={label}
                />
              </label>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stan konfiguracji</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {data.publicProfile
                ? data.publicProfile.published
                  ? "Profil publiczny jest opublikowany."
                  : "Profil publiczny jest zapisany jako szkic."
                : "Brak profilu publicznego."}
            </p>
            <p>Godziny ustawione dla {weeklyDays} z 7 dni.</p>
            <p>{upcoming.length} nadchodzących wyjątków dostępności.</p>
            {!data.publicProfile &&
            !data.openingHours.length &&
            !data.availabilityExceptions.length ? (
              <EmptyState
                title="Gabinet wymaga konfiguracji"
                description="Uzupełnij profil, godziny otwarcia i wyjątki w osobnych zakładkach."
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
