"use client";

import {
  getAdminSpecialistDetailAction,
  reviewSpecialistDraftAction,
  updateSpecialistOfferStateAction,
} from "@/features/specialists/actions";
import { specialistsKeys } from "@/features/specialists/query-keys";
import type {
  SpecialistDetailViewModel,
  SpecialistProfileSnapshotViewModel,
} from "@/features/specialists/types";
import { createProfileDiff } from "@/features/specialists/view-model";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { Label } from "@repo/ui/label";
import { EmptyState, PageHeader, SectionHeader } from "@repo/ui/portal-content";
import {
  ProfileReviewDiff,
  SpecialistOfferRow,
  SpecialistStatusSummary,
} from "@repo/ui/specialist-admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { isRichTextEmpty } from "@repo/contracts";
import { RichTextRenderer } from "@repo/ui/rich-text-renderer";
import { Textarea } from "@repo/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(value: string | null) {
  if (!value) return "Brak danych";
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function publicationMeta(detail: SpecialistDetailViewModel) {
  if (detail.draft?.status === "pending_review") {
    return { label: "Do weryfikacji", tone: "warning" as const };
  }
  switch (detail.publicProfile?.publicationStatus) {
    case "published":
      return { label: "Opublikowany", tone: "success" as const };
    case "rejected":
      return { label: "Odrzucony", tone: "danger" as const };
    case "draft":
      return { label: "Szkic", tone: "neutral" as const };
    default:
      return { label: "Brak profilu", tone: "neutral" as const };
  }
}

function DefinitionList({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="divide-y divide-[var(--border)]">
      {items.map((item) => (
        <div
          className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]"
          key={item.label}
        >
          <dt className="text-sm font-semibold text-[var(--text-muted)]">
            {item.label}
          </dt>
          <dd className="text-sm break-words text-[var(--text)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ProfileSnapshot({
  profile,
}: {
  profile: SpecialistProfileSnapshotViewModel;
}) {
  const list = (items: string[]) => items.join(", ") || "Brak danych";
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card>
        <CardHeader>
          <CardTitle>{profile.displayName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-[var(--text)]">
            Krótki opis
          </p>
          <p className="text-sm whitespace-pre-wrap text-[var(--text-muted)]">
            {profile.shortBio || "Brak opisu"}
          </p>
          <p className="pt-2 text-sm font-semibold text-[var(--text)]">
            Pełny opis
          </p>
          {isRichTextEmpty(profile.longBio) ? (
            <p className="text-sm text-[var(--text-muted)]">Brak opisu</p>
          ) : (
            <RichTextRenderer className="text-sm" document={profile.longBio} />
          )}
          <DefinitionList
            items={[
              {
                label: "Tytuł zawodowy",
                value: profile.professionalTitle ?? "Brak",
              },
              { label: "Języki", value: list(profile.languages) },
              { label: "Specjalizacje", value: list(profile.specializations) },
              { label: "Podejścia", value: list(profile.therapyApproaches) },
              { label: "Formy pracy", value: list(profile.modalities) },
              { label: "Wykształcenie", value: list(profile.education) },
              { label: "Certyfikaty", value: list(profile.certificates) },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Materiały</CardTitle>
        </CardHeader>
        <CardContent>
          {[profile.profilePhotoUrl, profile.portraitPhotoUrl].filter(Boolean)
            .length ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {profile.profilePhotoUrl ? (
                <Image
                  alt={`Zdjęcie profilowe ${profile.displayName}`}
                  className="h-auto w-full rounded-[var(--radius-control)] object-cover"
                  height={320}
                  src={profile.profilePhotoUrl}
                  unoptimized
                  width={320}
                />
              ) : null}
              {profile.portraitPhotoUrl ? (
                <Image
                  alt={`Portret ${profile.displayName}`}
                  className="h-auto w-full rounded-[var(--radius-control)] object-cover"
                  height={400}
                  src={profile.portraitPhotoUrl}
                  unoptimized
                  width={320}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Brak przesłanych zdjęć.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DraftReview({ detail }: { detail: SpecialistDetailViewModel }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();
  const draft = detail.draft;
  const mutation = useMutation({
    mutationFn: async (input: {
      action: "approve" | "reject";
      comment?: string;
    }) => {
      if (!draft) throw new Error("Brak szkicu do weryfikacji.");
      const result = await reviewSpecialistDraftAction({
        specialistId: detail.id,
        draftId: draft.id,
        ...input,
      });
      if (!result.ok) throw new Error(result.message);
    },
    onSuccess: async (_, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: specialistsKeys.detail(detail.id),
          exact: true,
        }),
        queryClient.invalidateQueries({ queryKey: specialistsKeys.lists() }),
      ]);
      setRejectOpen(false);
      setComment("");
      toast.success(
        input.action === "approve"
          ? "Profil został zatwierdzony"
          : "Szkic został odrzucony",
      );
    },
    onError: (error) => toast.error(error.message),
  });

  if (!draft || draft.status !== "pending_review") return null;

  return (
    <Card className="space-y-5 border-[var(--warning)]">
      <SectionHeader
        title="Szkic oczekuje na weryfikację"
        description={`Przesłano: ${formatDate(draft.submittedAt)}`}
      />
      <ProfileReviewDiff fields={createProfileDiff(detail)} />
      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Odrzuć zmiany</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Odrzuć szkic profilu</DialogTitle>
              <DialogDescription>
                Komentarz jest wymagany i będzie wskazówką dla specjalisty.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="rejection-comment">Powód odrzucenia</Label>
              <Textarea
                id="rejection-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                aria-invalid={comment.length > 0 && !comment.trim()}
              />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setRejectOpen(false)}>
                Anuluj
              </Button>
              <Button
                variant="destructive"
                loading={mutation.isPending}
                disabled={!comment.trim()}
                onClick={() =>
                  mutation.mutate({ action: "reject", comment: comment.trim() })
                }
              >
                Odrzuć szkic
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button>Zatwierdź i opublikuj</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Zatwierdzić profil?</AlertDialogTitle>
              <AlertDialogDescription>
                Proponowane dane zastąpią aktualny profil publiczny.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ action: "approve" })}
              >
                Zatwierdź
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}

function ServicesTab({ detail }: { detail: SpecialistDetailViewModel }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateSpecialistOfferStateAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: specialistsKeys.detail(detail.id),
        exact: true,
      });
      toast.success("Zaktualizowano ofertę");
    },
    onError: () => toast.error("Nie udało się zaktualizować oferty"),
  });

  if (detail.offers.length === 0) {
    return (
      <EmptyState
        title="Brak usług"
        description="Specjalista nie ma jeszcze skonfigurowanych ofert."
      />
    );
  }

  return (
    <Card>
      <SectionHeader
        title="Usługi i cennik"
        description="Zmiany dotyczą dostępności istniejących ofert."
      />
      <ul className="mt-3">
        {detail.offers.map((offer) => (
          <SpecialistOfferRow
            {...offer}
            key={offer.id}
            pending={
              mutation.isPending && mutation.variables?.offerId === offer.id
            }
            onActiveChange={(active) =>
              mutation.mutate({
                specialistId: detail.id,
                offerId: offer.id,
                active,
                acceptingNewClients: offer.acceptingNewClients,
              })
            }
            onAcceptingNewClientsChange={(acceptingNewClients) =>
              mutation.mutate({
                specialistId: detail.id,
                offerId: offer.id,
                active: offer.active,
                acceptingNewClients,
              })
            }
          />
        ))}
      </ul>
    </Card>
  );
}

export function SpecialistDetail({
  initialData,
}: {
  initialData: SpecialistDetailViewModel;
}) {
  const query = useQuery({
    queryKey: specialistsKeys.detail(initialData.id),
    queryFn: () => getAdminSpecialistDetailAction(initialData.id),
    initialData,
  });
  const detail = query.data ?? initialData;
  const publication = publicationMeta(detail);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/specjalisci">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Wróć do listy
        </Link>
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className="size-16">
          {detail.avatarUrl ? (
            <AvatarImage alt="" src={detail.avatarUrl} />
          ) : null}
          <AvatarFallback className="text-lg">{detail.initials}</AvatarFallback>
        </Avatar>
        <PageHeader
          className="flex-1"
          eyebrow="Specjalista"
          title={detail.displayName}
          description={detail.professionalTitle}
        />
      </div>
      <SpecialistStatusSummary
        active={detail.active}
        accountActive={detail.accountActive}
        acceptingNewClients={detail.acceptingNewClients}
        publicationLabel={publication.label}
        publicationTone={publication.tone}
      />

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTrigger value="overview">Przegląd</TabsTrigger>
            <TabsTrigger value="schedule">Grafik</TabsTrigger>
            <TabsTrigger value="services">Usługi i cennik</TabsTrigger>
            <TabsTrigger value="profile">Profil publiczny</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Dane konta</CardTitle>
              </CardHeader>
              <DefinitionList
                items={[
                  { label: "Identyfikator użytkownika", value: detail.userId },
                  { label: "Slug publiczny", value: detail.publicSlug },
                  { label: "Dołączył/a", value: formatDate(detail.joinedAt) },
                  {
                    label: "Konto",
                    value: detail.accountActive ? "Aktywne" : "Nieaktywne",
                  },
                  {
                    label: "Współpraca",
                    value: detail.active ? "Aktywna" : "Nieaktywna",
                  },
                ]}
              />
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Statusy konta i współpracy są w tym widoku tylko do odczytu.
              </p>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Podsumowanie profilu</CardTitle>
              </CardHeader>
              <DefinitionList
                items={[
                  { label: "Publikacja", value: publication.label },
                  {
                    label: "Ostatnia publikacja",
                    value: formatDate(
                      detail.publicProfile?.publishedAt ?? null,
                    ),
                  },
                  {
                    label: "Szkic",
                    value: detail.draft
                      ? publicationMeta(detail).label
                      : "Brak",
                  },
                  { label: "Usługi", value: String(detail.offers.length) },
                ]}
              />
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="schedule">
          <EmptyState
            title="Grafik będzie dostępny później"
            description="Ten etap nie obejmuje kalendarza, dostępności ani wizyt."
          />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab detail={detail} />
        </TabsContent>
        <TabsContent value="profile" className="space-y-5">
          <DraftReview detail={detail} />
          {detail.publicProfile ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <SectionHeader
                  title="Aktualny profil publiczny"
                  description={`Opublikowano: ${formatDate(detail.publicProfile.publishedAt)}`}
                />
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`${process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"}/specjalisci/${detail.publicSlug}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Podgląd{" "}
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </Button>
              </div>
              <ProfileSnapshot profile={detail.publicProfile} />
            </>
          ) : (
            <EmptyState
              title="Brak profilu publicznego"
              description="Profil pojawi się po zatwierdzeniu pierwszego szkicu."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
