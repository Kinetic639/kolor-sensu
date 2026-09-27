"use client";

import {
  getRoomsPageContentAction,
  publishRoomsPageContentAction,
  updateRoomsPageDraftAction,
} from "@/features/cms/actions";
import { roomsPageKeys } from "@/features/cms/query-keys";
import type { RoomsPageViewModel } from "@/features/cms/types";
import type { RoomsPageContent } from "@repo/contracts";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { SectionHeader } from "@repo/ui/portal-content";
import { Switch } from "@repo/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const sections: Array<{
  name: keyof RoomsPageContent;
  label: string;
  description: string;
}> = [
  {
    name: "showAmenitiesSection",
    label: "Sekcja „Co u nas znajdziesz”",
    description: "Lista zalet centrum pod nagłówkiem strony.",
  },
  {
    name: "showLocationDetails",
    label: "Opis siedziby",
    description:
      "Nazwa, adres, opis i udogodnienia każdej lokalizacji nad jej gabinetami.",
  },
];

/**
 * /gabinety: switch the optional sections, save as a draft, then publish.
 * With both off the page shows only its title and the rooms.
 */
export function CmsRoomsEditor({
  initialData,
}: {
  initialData: RoomsPageViewModel;
}) {
  const queryClient = useQueryClient();
  const { data: content } = useQuery({
    queryKey: roomsPageKeys.detail(),
    queryFn: () => getRoomsPageContentAction(),
    initialData,
  });
  const [draft, setDraft] = useState<RoomsPageContent>({
    showAmenitiesSection: content.showAmenitiesSection,
    showLocationDetails: content.showLocationDetails,
  });
  useEffect(() => {
    setDraft({
      showAmenitiesSection: content.showAmenitiesSection,
      showLocationDetails: content.showLocationDetails,
    });
  }, [content.showAmenitiesSection, content.showLocationDetails]);

  const isDirty =
    draft.showAmenitiesSection !== content.showAmenitiesSection ||
    draft.showLocationDetails !== content.showLocationDetails;

  const saveMutation = useMutation({
    mutationFn: (input: RoomsPageContent) => updateRoomsPageDraftAction(input),
    onSuccess: (next) => {
      queryClient.setQueryData(roomsPageKeys.detail(), next);
      toast.success("Zapisano szkic");
    },
    onError: () => toast.error("Nie udało się zapisać ustawień"),
  });
  const publishMutation = useMutation({
    mutationFn: () => publishRoomsPageContentAction(),
    onSuccess: (next) => {
      queryClient.setQueryData(roomsPageKeys.detail(), next);
      toast.success("Strona Gabinety opublikowana");
    },
    onError: () => toast.error("Publikacja się nie powiodła"),
  });

  return (
    <Card className="space-y-4 p-5">
      <SectionHeader
        title="Gabinety"
        description="Nagłówek strony i opisy gabinetów są zawsze widoczne. Poniżej włączysz lub ukryjesz pozostałe sekcje."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={content.isPublished ? "success" : "neutral"}>
          {content.isPublished ? "Opublikowana" : "Nieopublikowana"}
        </Badge>
        {content.isPublished && content.hasUnpublishedChanges ? (
          <Badge variant="warning">Niepublikowane zmiany</Badge>
        ) : null}
        <span className="text-xs text-[var(--text-muted)]">
          Ostatnia aktualizacja: {content.updatedAtLabel}
        </span>
        {content.publishedAtLabel ? (
          <span className="text-xs text-[var(--text-muted)]">
            Ostatnia publikacja: {content.publishedAtLabel}
          </span>
        ) : null}
      </div>
      <div className="grid gap-3">
        {sections.map((section) => (
          <label
            className="flex min-h-11 items-center justify-between gap-4 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2.5"
            key={section.name}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--text)]">
                {section.label}
              </span>
              <span className="block text-xs text-[var(--text-muted)]">
                {section.description}
              </span>
            </span>
            <Switch
              aria-label={section.label}
              checked={draft[section.name]}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, [section.name]: checked }))
              }
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={!isDirty}
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate(draft)}
          variant="secondary"
        >
          Zapisz szkic
        </Button>
        <Button
          disabled={isDirty || !content.hasUnpublishedChanges}
          loading={publishMutation.isPending}
          onClick={() => publishMutation.mutate()}
        >
          Publikuj
        </Button>
      </div>
      {isDirty ? (
        <p className="text-xs text-[var(--text-muted)]" role="status">
          Zapisz szkic, aby móc go opublikować.
        </p>
      ) : null}
    </Card>
  );
}
