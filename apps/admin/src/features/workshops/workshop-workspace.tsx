"use client";

import {
  articleDocumentSchema,
  emptyArticleDocument,
  isArticleEmpty,
  type ArticleDocument,
} from "@repo/contracts/article-rich-text";
import { formatMinor, parseZloty } from "@repo/contracts/discount-codes";
import { WORKSHOP_LIMITS, type WorkshopInput } from "@repo/contracts/workshops";
import { educationImageUrl } from "@repo/supabase/education";
import { uploadWorkshopImage } from "@repo/supabase/workshops-admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { ArticleEditor } from "@repo/ui/article-editor";
import { Button } from "@repo/ui/button";
import { DetailBar } from "@repo/ui/detail-page";
import { toast } from "@repo/ui/toast";
import { Tag } from "@repo/ui/visit-table";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { SiteImageField } from "@/features/cms/site-image-field";
import { TextField } from "@/features/cms/text-field";
import {
  CheckList,
  imageSize,
  SectionLinks,
  SelectField,
  WORKSPACE_FIELD,
  WorkspaceSection,
} from "@/features/education/workspace-parts";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slugify";
import type { ActionResult } from "@/lib/use-save";
import {
  cancelWorkshopAction,
  confirmWorkshopAction,
  deleteWorkshopAction,
  publishWorkshopAction,
  saveWorkshopAction,
  unpublishWorkshopAction,
} from "./actions";
import type { PlaceOption } from "./loaders";

// A workshop in the portal (docs/product/workshops-plan.md, PR 2), its
// sections down one page (one form, one save): the basics (title, address,
// short description, cover), the description in the article editor with
// who it is for and the program, the date and place (or the online link),
// the leaders, the price and seats, what Google shows. The bar saves,
// publishes (saving first), confirms it will go ahead, withdraws it to a
// draft or deletes it while nobody signed up, and cancels it (with a
// reason; the site refunds everyone who paid).

const SECTIONS = [
  { id: "podstawy", label: "Podstawy" },
  { id: "opis", label: "Opis" },
  { id: "termin", label: "Termin i miejsce" },
  { id: "prowadzacy", label: "Prowadzący" },
  { id: "zapisy", label: "Cena i zapisy" },
  { id: "powiazane", label: "Powiązane" },
  { id: "seo", label: "Google i udostępnianie" },
] as const;

export interface WorkshopState {
  id: string | null;
  status: "draft" | "published" | "cancelled" | "completed";
  confirmed: boolean;
  activeRegistrations: number;
  anyRegistrations: boolean;
  cancelReason: string | null;
  /** The saved address (what the site shows now). */
  savedSlug: string | null;
}

const STATE_TAGS = {
  draft: { label: "Szkic", tone: "neutral" },
  published: { label: "Opublikowany", tone: "success" },
  cancelled: { label: "Odwołany", tone: "warning" },
  completed: { label: "Zakończony", tone: "neutral" },
} as const;

const BAR_BUTTON = "h-7 px-2.5 text-[0.8125rem]";

function documentOf(body: unknown): ArticleDocument {
  const parsed = articleDocumentSchema.safeParse(body);
  return parsed.success ? parsed.data : emptyArticleDocument;
}

export function WorkshopWorkspace({
  initial,
  state,
  specialists,
  places,
  services,
  articles,
  webUrl,
  participants,
}: {
  initial: WorkshopInput;
  state: WorkshopState;
  specialists: readonly { id: string; name: string }[];
  places: readonly PlaceOption[];
  services: readonly { id: string; slug: string; name: string }[];
  /** The published articles, for "Powiązane" (#185). */
  articles: readonly { id: string; title: string }[];
  /** The public site's address, for "Zobacz na stronie". */
  webUrl: string;
  /** The participants' section (a saved workshop). */
  participants?: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [body, setBody] = useState(() => documentOf(initial.body));
  const [price, setPrice] = useState(
    initial.priceMinor
      ? (initial.priceMinor / 100).toFixed(2).replace(".", ",")
      : "0",
  );
  const [asking, setAsking] = useState<
    "delete" | "unpublish" | "cancel" | null
  >(null);
  const [reason, setReason] = useState("");
  const client = useMemo(() => createClient(), []);
  const imageUrl = (path: string) => educationImageUrl(client, path);

  const current: WorkshopInput = {
    ...draft,
    body: isArticleEmpty(body) ? null : body,
  };
  const dirty =
    state.id === null || JSON.stringify(current) !== JSON.stringify(saved);
  const change = (patch: Partial<WorkshopInput>) =>
    setDraft((now) => ({ ...now, ...patch }));
  const place = places.find((one) => one.id === draft.locationId) ?? null;
  const cancelled = state.status === "cancelled";

  function setTitle(title: string) {
    // The address follows the title until it is published or changed by hand.
    const follows = !state.savedSlug || state.status === "draft";
    const auto = slugify(title);
    change(
      follows && (draft.slug === "" || draft.slug === slugify(draft.title))
        ? { title, slug: auto }
        : { title },
    );
  }

  /** Saves (when anything changed); the workshop's id, or null on a refusal. */
  async function save(): Promise<string | null> {
    const priceMinor = parseZloty(price);
    if (priceMinor === null) {
      toast.error("Podaj cenę, np. 150 albo 149,99 (0: bezpłatny).");
      return null;
    }
    const input = { ...current, priceMinor };
    if (state.id && !dirty && priceMinor === saved.priceMinor) return state.id;
    const result = await saveWorkshopAction(state.id, input);
    if (!result.ok) {
      toast.error(result.message);
      return null;
    }
    setSaved(input);
    setDraft((now) => ({ ...now, priceMinor }));
    return result.id;
  }

  function onSave() {
    startTransition(async () => {
      const id = await save();
      if (!id) return;
      toast.success("Zapisano warsztat");
      if (!state.id) router.push(`/warsztaty/${id}`);
      else router.refresh();
    });
  }

  function step(
    action: (id: string, slug: string) => Promise<ActionResult>,
    success: string,
    {
      saveFirst = false,
      after,
    }: { saveFirst?: boolean; after?: () => void } = {},
  ) {
    startTransition(async () => {
      const id = saveFirst ? await save() : state.id;
      if (!id) return;
      const result = await action(id, draft.slug);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(success);
      if (after) after();
      else if (!state.id) router.push(`/warsztaty/${id}`);
      else router.refresh();
    });
  }

  function cancelWorkshop() {
    if (!state.id) return;
    const id = state.id;
    startTransition(async () => {
      const result = await cancelWorkshopAction(id, draft.slug, reason);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (result.refundFailed)
        toast.error(
          "Warsztat odwołany, ale części zwrotów nie udało się zrobić. Sprawdź płatności w Stripe.",
        );
      else
        toast.success(
          result.refunded
            ? `Warsztat odwołany. Zwroty: ${result.refunded}.`
            : "Warsztat odwołany.",
        );
      setAsking(null);
      router.refresh();
    });
  }

  const tag = STATE_TAGS[state.status];
  const live = state.status === "published" && state.savedSlug;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DetailBar
        actions={
          <>
            {dirty && state.id ? (
              <span className="hidden text-[0.75rem] text-[var(--text-muted)] sm:inline">
                Niezapisane zmiany
              </span>
            ) : null}
            {live ? (
              <Button
                asChild
                className={BAR_BUTTON}
                size="sm"
                variant="outline"
              >
                <a
                  href={`${webUrl}/warsztaty/${state.savedSlug}`}
                  rel="noopener"
                  target="_blank"
                >
                  Zobacz na stronie
                  <span className="sr-only"> (nowa karta)</span>
                </a>
              </Button>
            ) : null}
            {state.id && state.status === "draft" ? (
              <Button
                asChild
                className={BAR_BUTTON}
                size="sm"
                variant="outline"
              >
                <a
                  href={`/podglad?warsztat=${state.id}`}
                  rel="noopener"
                  target="_blank"
                  title={
                    dirty
                      ? "Podgląd pokazuje zapisany szkic: najpierw zapisz zmiany."
                      : undefined
                  }
                >
                  Podgląd
                  <span className="sr-only"> (nowa karta)</span>
                </a>
              </Button>
            ) : null}
            {!cancelled ? (
              <Button
                className={BAR_BUTTON}
                disabled={!dirty || pending}
                onClick={onSave}
                size="sm"
                variant="secondary"
              >
                Zapisz
              </Button>
            ) : null}
            {state.status === "draft" ? (
              <Button
                className={BAR_BUTTON}
                disabled={pending}
                loading={pending}
                onClick={() =>
                  step(publishWorkshopAction, "Opublikowano", {
                    saveFirst: true,
                  })
                }
                size="sm"
              >
                Opublikuj
              </Button>
            ) : null}
            {state.status === "published" &&
            draft.minParticipants &&
            !state.confirmed ? (
              <Button
                className={BAR_BUTTON}
                disabled={pending}
                onClick={() =>
                  step(confirmWorkshopAction, "Warsztat potwierdzony")
                }
                size="sm"
              >
                Potwierdź warsztat
              </Button>
            ) : null}
            {state.status === "published" && state.activeRegistrations === 0 ? (
              <Button
                className={BAR_BUTTON}
                disabled={pending}
                onClick={() => setAsking("unpublish")}
                size="sm"
                variant="outline"
              >
                Wycofaj
              </Button>
            ) : null}
            {state.status === "published" ? (
              <Button
                className={BAR_BUTTON}
                disabled={pending}
                onClick={() => setAsking("cancel")}
                size="sm"
                variant="outline"
              >
                Odwołaj
              </Button>
            ) : null}
            {state.id &&
            (state.status === "draft" || cancelled) &&
            !state.anyRegistrations ? (
              <Button
                className={BAR_BUTTON}
                disabled={pending}
                onClick={() => setAsking("delete")}
                size="sm"
                variant="outline"
              >
                Usuń
              </Button>
            ) : null}
          </>
        }
        back={{ href: "/warsztaty", label: "Warsztaty" }}
        tags={
          <span className="flex gap-1">
            <Tag tone={tag.tone}>{tag.label}</Tag>
            {state.status === "published" && draft.minParticipants ? (
              <Tag tone={state.confirmed ? "success" : "info"}>
                {state.confirmed ? "Potwierdzony" : "Czeka na komplet"}
              </Tag>
            ) : null}
          </span>
        }
        title={draft.title || "Nowy warsztat"}
      />
      <SectionLinks
        sections={
          participants
            ? [{ id: "uczestnicy", label: "Uczestnicy" }, ...SECTIONS]
            : SECTIONS
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface)]">
        {cancelled ? (
          <p className="mx-3.5 mt-3 rounded-[var(--radius-control)] border border-[var(--border)] p-3 text-sm">
            Warsztat jest odwołany
            {state.cancelReason
              ? `: ${state.cancelReason.trim().replace(/\.+$/, "")}`
              : ""}
            . Zapisani dostali zwrot pieniędzy.
          </p>
        ) : null}
        {participants ? (
          <WorkspaceSection id="uczestnicy" title="Uczestnicy">
            {participants}
          </WorkspaceSection>
        ) : null}
        <fieldset className="contents" disabled={cancelled}>
          <WorkspaceSection id="podstawy" title="Podstawy">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid content-start gap-3">
                <TextField
                  id="workshop-title"
                  label="Tytuł"
                  maxLength={WORKSHOP_LIMITS.title}
                  onChange={setTitle}
                  value={draft.title}
                />
                <TextField
                  hint={
                    state.status !== "draft" && state.savedSlug !== draft.slug
                      ? "Uwaga: stary adres przestanie działać (linki w e-mailach prowadzą do zapisów, nie do strony)."
                      : "Tworzy się z tytułu; małe litery, cyfry i myślniki."
                  }
                  id="workshop-slug"
                  label="Adres: /warsztaty/…"
                  maxLength={100}
                  onChange={(slug) =>
                    change({ slug: slug.toLowerCase().replace(/\s+/g, "-") })
                  }
                  value={draft.slug}
                />
                <TextField
                  hint="Pod tytułem, na karcie warsztatu i w Google. Potrzebny do publikacji."
                  id="workshop-short"
                  label="Krótki opis"
                  maxLength={WORKSHOP_LIMITS.shortDescription}
                  multiline
                  onChange={(shortDescription) => change({ shortDescription })}
                  rows={3}
                  value={draft.shortDescription}
                />
              </div>
              <SiteImageField
                folder="workshops"
                hint="Okładka: na karcie i stronie warsztatu. Poziome zdjęcie, najlepiej 16 : 9."
                id="workshop-cover"
                label="Okładka"
                onChange={(patch) =>
                  change({
                    ...(patch.imagePath !== undefined
                      ? { coverPath: patch.imagePath }
                      : {}),
                    ...(patch.imageAlt !== undefined
                      ? { coverAlt: patch.imageAlt }
                      : {}),
                  })
                }
                value={{
                  imagePath: draft.coverPath,
                  imageUrl: draft.coverPath ? imageUrl(draft.coverPath) : null,
                  imageAlt: draft.coverAlt,
                }}
              />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            id="opis"
            note="„/” albo „Wstaw”: zdjęcie, ramka, tabela, przycisk"
            title="Opis"
          >
            <ArticleEditor
              ariaLabel="Opis warsztatu"
              disabled={cancelled}
              imageUrl={imageUrl}
              onChange={setBody}
              services={services}
              uploadImage={async (file) => {
                const size = await imageSize(file);
                const src = await uploadWorkshopImage(client, file);
                return { src, ...size };
              }}
              value={body}
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <TextField
                hint="Do kogo jest warsztat. Puste: bez tej sekcji."
                id="workshop-audience"
                label="Dla kogo"
                maxLength={WORKSHOP_LIMITS.audience}
                multiline
                onChange={(audience) => change({ audience })}
                rows={4}
                value={draft.audience}
              />
              <TextField
                hint="Każdy punkt w nowej linii. Puste: bez programu."
                id="workshop-agenda"
                label="Program"
                maxLength={WORKSHOP_LIMITS.agenda}
                multiline
                onChange={(agenda) => change({ agenda })}
                rows={4}
                value={draft.agenda}
              />
            </div>
          </WorkspaceSection>

          <WorkspaceSection id="termin" title="Termin i miejsce">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid content-start gap-1">
                <label className="text-sm font-medium" htmlFor="workshop-date">
                  Data
                </label>
                <input
                  className={WORKSPACE_FIELD}
                  id="workshop-date"
                  onChange={(event) => change({ date: event.target.value })}
                  type="date"
                  value={draft.date}
                />
              </div>
              <div className="grid content-start gap-1">
                <label className="text-sm font-medium" htmlFor="workshop-start">
                  Od
                </label>
                <input
                  className={WORKSPACE_FIELD}
                  id="workshop-start"
                  onChange={(event) =>
                    change({ startTime: event.target.value })
                  }
                  step={900}
                  type="time"
                  value={draft.startTime}
                />
              </div>
              <div className="grid content-start gap-1">
                <label className="text-sm font-medium" htmlFor="workshop-end">
                  Do
                </label>
                <input
                  className={WORKSPACE_FIELD}
                  id="workshop-end"
                  onChange={(event) => change({ endTime: event.target.value })}
                  step={900}
                  type="time"
                  value={draft.endTime}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField
                id="workshop-modality"
                label="Forma"
                onChange={(value) =>
                  change({ modality: value as WorkshopInput["modality"] })
                }
                options={[
                  { value: "in_person", label: "Stacjonarnie" },
                  { value: "online", label: "Online" },
                ]}
                value={draft.modality}
              />
              {draft.modality === "in_person" ? (
                <>
                  <SelectField
                    id="workshop-location"
                    label="Miejsce"
                    onChange={(value) =>
                      change({ locationId: value || null, roomId: null })
                    }
                    options={[
                      { value: "", label: "Wybierz miejsce" },
                      ...places.map((one) => ({
                        value: one.id,
                        label: one.name,
                      })),
                    ]}
                    value={draft.locationId ?? ""}
                  />
                  <SelectField
                    hint="Sala będzie zablokowana dla wizyt w czasie warsztatu."
                    id="workshop-room"
                    label="Sala (opcjonalnie)"
                    onChange={(value) => change({ roomId: value || null })}
                    options={[
                      { value: "", label: "Bez sali" },
                      ...(place?.rooms ?? []).map((one) => ({
                        value: one.id,
                        label: one.name,
                      })),
                    ]}
                    value={draft.roomId ?? ""}
                  />
                </>
              ) : (
                <div className="sm:col-span-2">
                  <TextField
                    hint="Widzą go tylko zapisani (e-mail dzień przed i strona zapisu), nigdy strona warsztatu."
                    id="workshop-link"
                    label="Link do spotkania (Zoom, Meet…)"
                    maxLength={2048}
                    onChange={(meetingUrl) => change({ meetingUrl })}
                    value={draft.meetingUrl}
                  />
                </div>
              )}
            </div>
          </WorkspaceSection>

          <WorkspaceSection id="prowadzacy" title="Prowadzący">
            <div className="grid gap-4 lg:grid-cols-2">
              <SelectField
                hint="Prowadzący (i współprowadzący) mają w tym czasie zablokowane wizyty."
                id="workshop-leader"
                label="Prowadzi"
                onChange={(specialistId) => change({ specialistId })}
                options={specialists.map((one) => ({
                  value: one.id,
                  label: one.name,
                }))}
                value={draft.specialistId}
              />
              <CheckList
                chosen={draft.coLeaderIds}
                empty="Nie ma innych specjalistów."
                legend="Współprowadzący (opcjonalnie)"
                onChange={(coLeaderIds) => change({ coLeaderIds })}
                options={specialists
                  .filter((one) => one.id !== draft.specialistId)
                  .map((one) => ({ value: one.id, label: one.name }))}
              />
            </div>
          </WorkspaceSection>

          <WorkspaceSection id="zapisy" title="Cena i zapisy">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                hint={
                  parseZloty(price) === 0
                    ? "Bezpłatny: zapis bez płatności."
                    : "Np. 150 albo 149,99."
                }
                id="workshop-price"
                label="Cena (zł)"
                maxLength={10}
                onChange={setPrice}
                value={price}
              />
              <TextField
                id="workshop-capacity"
                label="Liczba miejsc"
                maxLength={3}
                onChange={(value) =>
                  change({ capacity: Number(value.replace(/\D/g, "")) || 0 })
                }
                value={String(draft.capacity || "")}
              />
              <TextField
                hint="Puste: odbywa się bez względu na liczbę osób."
                id="workshop-min"
                label="Minimum osób (opcjonalnie)"
                maxLength={3}
                onChange={(value) => {
                  const digits = value.replace(/\D/g, "");
                  change({ minParticipants: digits ? Number(digits) : null });
                }}
                value={
                  draft.minParticipants ? String(draft.minParticipants) : ""
                }
              />
              <TextField
                hint="Ile godzin przed startem kończą się zapisy. Puste: 24."
                id="workshop-closes"
                label="Koniec zapisów (godz. przed)"
                maxLength={4}
                onChange={(value) => {
                  const digits = value.replace(/\D/g, "");
                  change({ closesHoursBefore: digits ? Number(digits) : null });
                }}
                value={
                  draft.closesHoursBefore === null
                    ? ""
                    : String(draft.closesHoursBefore)
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={draft.registrationEnabled}
                className="size-4 accent-[var(--primary)]"
                onChange={(event) =>
                  change({ registrationEnabled: event.target.checked })
                }
                type="checkbox"
              />
              Zapisy przez stronę włączone
            </label>
            <p className="text-[0.75rem] text-[var(--text-muted)]">
              Zwrot pełny do 7 dni przed; „Zapłacę później” z wpłatą do 7 dni
              przed. Minimum potwierdza warsztat samo, gdy tylu zapłaci; możesz
              też potwierdzić go wcześniej.
              {saved.priceMinor
                ? ` Teraz: ${formatMinor(saved.priceMinor)} za miejsce.`
                : ""}
            </p>
          </WorkspaceSection>

          <WorkspaceSection
            id="powiazane"
            note="pod warsztatem na stronie, z innymi nadchodzącymi warsztatami"
            title="Powiązane"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <CheckList
                chosen={draft.serviceIds}
                empty="Nie ma jeszcze usług."
                legend={`Usługi (do ${WORKSHOP_LIMITS.services}; bez wyboru: usługi prowadzącego)`}
                onChange={(serviceIds) =>
                  change({
                    serviceIds: serviceIds.slice(0, WORKSHOP_LIMITS.services),
                  })
                }
                options={services.map((one) => ({
                  value: one.id,
                  label: one.name,
                }))}
              />
              <CheckList
                chosen={draft.articleIds}
                empty="Nie ma jeszcze opublikowanych artykułów."
                legend={`Artykuły (do ${WORKSHOP_LIMITS.articles})`}
                onChange={(articleIds) =>
                  change({
                    articleIds: articleIds.slice(0, WORKSHOP_LIMITS.articles),
                  })
                }
                options={articles.map((one) => ({
                  value: one.id,
                  label: one.title,
                }))}
              />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            id="seo"
            note="puste pola biorą tytuł i krótki opis"
            title="Google i udostępnianie"
          >
            <div className="grid gap-3 lg:grid-cols-2">
              <TextField
                hint="Puste: „Tytuł · Warsztaty”."
                id="workshop-seo-title"
                label="Tytuł w Google"
                maxLength={WORKSHOP_LIMITS.seoTitle}
                onChange={(seoTitle) => change({ seoTitle })}
                value={draft.seoTitle}
              />
              <TextField
                hint="Puste: krótki opis."
                id="workshop-seo-description"
                label="Opis w Google"
                maxLength={WORKSHOP_LIMITS.seoDescription}
                multiline
                onChange={(seoDescription) => change({ seoDescription })}
                value={draft.seoDescription}
              />
            </div>
          </WorkspaceSection>
        </fieldset>
      </div>

      <AlertDialog
        onOpenChange={(open) => setAsking(open ? asking : null)}
        open={asking !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {asking === "cancel"
                ? "Odwołać warsztat?"
                : asking === "unpublish"
                  ? "Wycofać warsztat ze strony?"
                  : "Usunąć warsztat?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {asking === "cancel"
                ? "Wszyscy zapisani stracą miejsca, a każdy, kto zapłacił, dostanie pełny zwrot. Warsztat zostanie na stronie z etykietą „Odwołany”. Tego nie da się cofnąć."
                : asking === "unpublish"
                  ? "Warsztat zniknie ze strony i wróci do szkiców. Nikt nie jest zapisany."
                  : "Warsztat zniknie na zawsze."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {asking === "cancel" ? (
            <TextField
              hint="Opcjonalnie; zapisani dowiedzą się, dlaczego."
              id="workshop-cancel-reason"
              label="Powód"
              maxLength={1000}
              multiline
              onChange={setReason}
              value={reason}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Nie</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (asking === "cancel") cancelWorkshop();
                else if (asking === "unpublish")
                  step(unpublishWorkshopAction, "Wycofano ze strony", {
                    after: () => {
                      setAsking(null);
                      router.refresh();
                    },
                  });
                else
                  step(deleteWorkshopAction, "Usunięto warsztat", {
                    after: () => router.push("/warsztaty"),
                  });
              }}
            >
              {asking === "cancel"
                ? "Odwołaj i zwróć pieniądze"
                : asking === "unpublish"
                  ? "Wycofaj"
                  : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
