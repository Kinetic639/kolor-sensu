"use client";

import { TextField } from "@/features/cms/text-field";
import {
  SelectField,
  WorkspaceSection,
} from "@/features/education/workspace-parts";
import { useSave } from "@/lib/use-save";
import {
  NEWSLETTER_ISSUE_LIMITS,
  NEWSLETTER_ITEM_KIND_LABELS,
  newsletterIssueProblems,
  type NewsletterCard,
  type NewsletterIssueDraft,
  type NewsletterIssueStatus,
  type NewsletterItem,
} from "@repo/contracts/newsletter-issue";
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
import { Button } from "@repo/ui/button";
import { DETAIL_BUTTON, DetailBar } from "@repo/ui/detail-page";
import { RichTextEditor } from "@repo/ui/rich-text-editor";
import { toast } from "@repo/ui/toast";
import { Tag } from "@repo/ui/visit-table";
import { ArrowDown, ArrowUp, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  cancelIssueAction,
  deleteIssueAction,
  previewIssueAction,
  saveIssueAction,
  sendIssueAction,
  setIssueArchiveAction,
  testIssueAction,
  type IssuePreview,
} from "./issue-actions";
import {
  defaultSendTime,
  issueSummary,
  issueTag,
  itemTitle,
  moveItem,
  sendAtFromLocal,
} from "./issue-view";

// One issue in the portal: its subject and the line under it, the
// introduction, the cards (published articles and e-books, own cards: a
// workshop, an event, news), the closing word and whether it shows in the
// site's archive; beside it, the e-mail as it will look. A draft is saved,
// tested on the admin's own address and sent now or at a chosen time
// (after a question naming how many it goes to); a scheduled one can be
// taken back; a sent one only changes whether the archive shows it.

export interface IssueWorkspaceProps {
  id: string;
  initial: NewsletterIssueDraft;
  status: NewsletterIssueStatus;
  number: number | null;
  sendAt: string | null;
  recipients: number | null;
  stoppedAfter: number | null;
  /** The addresses in Resend now (who a send goes to). */
  subscribers: number;
  articles: readonly { id: string; title: string }[];
  ebooks: readonly { id: string; title: string }[];
  /** The site's address, for the archive's link. */
  siteUrl: string;
}

const emptyCard = (): NewsletterCard => ({
  kind: "card",
  title: "",
  text: "",
  href: "",
  label: "",
});

export function IssueWorkspace(props: IssueWorkspaceProps) {
  const { id } = props;
  const editable = props.status === "draft";
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(props.initial);
  const [saved, setSaved] = useState(props.initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<NewsletterIssueDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const tag = issueTag(props);
  const summary = issueSummary(props);
  const problems = newsletterIssueProblems(draft);
  const [asking, setAsking] = useState<"send" | "delete" | "cancel" | null>(
    null,
  );

  const titles = useMemo(
    () => ({
      articles: new Map(props.articles.map((one) => [one.id, one.title])),
      ebooks: new Map(props.ebooks.map((one) => [one.id, one.title])),
    }),
    [props.articles, props.ebooks],
  );

  // ---------------------------------------------------------- preview
  const [preview, setPreview] = useState<IssuePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, startPreview] = useTransition();
  function refreshPreview(of: NewsletterIssueDraft = draft) {
    startPreview(async () => {
      const answer = await previewIssueAction(of);
      if (answer.ok) {
        setPreview(answer.value);
        setPreviewError(null);
      } else {
        setPreviewError(answer.message);
      }
    });
  }
  useEffect(() => {
    refreshPreview(props.initial);
    // The first look only; later on request and after each save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------- actions
  const save = () =>
    run(
      () => saveIssueAction(id, draft),
      "Zapisano wydanie",
      () => {
        setSaved(draft);
        refreshPreview(draft);
      },
    );

  const [testing, startTest] = useTransition();
  const test = () =>
    startTest(async () => {
      const answer = await testIssueAction(draft);
      if (answer.ok)
        toast.success(`Wysłano test na ${answer.to ?? "Twój adres"}`);
      else toast.error(answer.message);
    });

  const [when, setWhen] = useState<"now" | "later">("now");
  const [later, setLater] = useState(defaultSendTime);
  const send = () => {
    const sendAt =
      when === "now" ? null : sendAtFromLocal(later.date, later.time);
    if (when === "later" && !sendAt) {
      toast.error("Podaj datę i godzinę wysyłki.");
      return;
    }
    run(
      () => sendIssueAction(id, draft, sendAt),
      when === "now" ? "Wydanie wysłane" : "Wydanie zaplanowane",
      () => setSaved(draft),
    );
  };

  const items = draft.items;
  const setItems = (next: NewsletterItem[]) => change({ items: next });
  const full = items.length >= NEWSLETTER_ISSUE_LIMITS.items;
  const [pickArticle, setPickArticle] = useState("");
  const [pickEbook, setPickEbook] = useState("");

  const archiveUrl = props.number
    ? `${props.siteUrl}/newsletter/${props.number}`
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DetailBar
        actions={
          editable ? (
            <>
              {dirty ? (
                <span className="hidden text-[0.75rem] text-[var(--text-muted)] sm:inline">
                  Niezapisane zmiany
                </span>
              ) : null}
              <Button
                className="h-7 px-2.5 text-[0.8125rem]"
                disabled={!dirty || isPending}
                onClick={save}
                size="sm"
                variant="secondary"
              >
                Zapisz
              </Button>
              <Button
                className="h-7 px-2.5 text-[0.8125rem]"
                disabled={testing || problems.length > 0}
                loading={testing}
                onClick={test}
                size="sm"
                title={problems.join(" ") || "Wydanie na Twój adres e-mail"}
                variant="outline"
              >
                Wyślij test
              </Button>
              <Button
                className="h-7 px-2.5 text-[0.8125rem]"
                disabled={isPending || problems.length > 0}
                onClick={() => setAsking("send")}
                size="sm"
                title={problems.join(" ") || undefined}
              >
                Wyślij…
              </Button>
              <Button
                className="h-7 px-2.5 text-[0.8125rem]"
                disabled={isPending}
                onClick={() => setAsking("delete")}
                size="sm"
                variant="outline"
              >
                Usuń
              </Button>
            </>
          ) : tag.state === "scheduled" ? (
            <Button
              className="h-7 px-2.5 text-[0.8125rem]"
              disabled={isPending}
              onClick={() => setAsking("cancel")}
              size="sm"
              variant="outline"
            >
              Wycofaj wysyłkę
            </Button>
          ) : null
        }
        back={{ href: "/newsletter", label: "Newsletter" }}
        subtitle={props.number ? `Nr ${props.number}` : null}
        tags={<Tag tone={tag.tone}>{tag.label}</Tag>}
        title={draft.subject.trim() || "Nowe wydanie"}
      />

      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface)] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:overflow-hidden">
        <div className="min-w-0 lg:overflow-y-auto">
          {summary ? (
            <p
              className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-3.5 py-2.5 text-[0.8125rem] text-[var(--text)]"
              role="status"
            >
              {summary}
              {archiveUrl && tag.state === "sent" && draft.inArchive ? (
                <>
                  {" "}
                  <a
                    className="underline"
                    href={archiveUrl}
                    rel="noopener"
                    target="_blank"
                  >
                    Zobacz w archiwum
                    <span className="sr-only"> (nowa karta)</span>
                  </a>
                </>
              ) : null}
            </p>
          ) : null}

          <fieldset className="contents" disabled={!editable}>
            <WorkspaceSection
              id="temat"
              note="to widać w skrzynce odbiorcy"
              title="Temat"
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <TextField
                  id="issue-subject"
                  label="Temat wiadomości"
                  maxLength={NEWSLETTER_ISSUE_LIMITS.subject}
                  onChange={(subject) => change({ subject })}
                  value={draft.subject}
                />
                <TextField
                  hint="Krótka linijka, którą skrzynka pokazuje pod tematem."
                  id="issue-preview"
                  label="Zajawka (opcjonalnie)"
                  maxLength={NEWSLETTER_ISSUE_LIMITS.previewText}
                  onChange={(previewText) => change({ previewText })}
                  value={draft.previewText}
                />
              </div>
            </WorkspaceSection>

            <WorkspaceSection id="wstep" title="Wstęp">
              {editable ? (
                <RichTextEditor
                  ariaLabel="Wstęp wydania"
                  onChange={(intro) => change({ intro })}
                  placeholder="Kilka zdań na początek: co słychać w centrum, o czym jest to wydanie…"
                  value={draft.intro}
                />
              ) : (
                <p className="text-[0.8125rem] text-[var(--text-muted)]">
                  Treść jak w podglądzie obok.
                </p>
              )}
            </WorkspaceSection>

            <WorkspaceSection
              id="karty"
              note={`artykuły, e-booki i własne karty, do ${NEWSLETTER_ISSUE_LIMITS.items}`}
              title="Karty"
            >
              {items.length === 0 ? (
                <p className="text-[0.8125rem] text-[var(--text-muted)]">
                  Jeszcze nic. Dodaj artykuł, e-book albo własną kartę, np.
                  zaproszenie na warsztat.
                </p>
              ) : (
                <ol className="grid gap-2">
                  {items.map((item, index) => (
                    <li
                      className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-2.5"
                      key={index}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[0.75rem] text-[var(--text-muted)]">
                          {NEWSLETTER_ITEM_KIND_LABELS[item.kind]}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">
                          {itemTitle(item, titles)}
                        </span>
                        {editable ? (
                          <>
                            <button
                              aria-label={`Przesuń w górę: ${itemTitle(item, titles)}`}
                              className={DETAIL_BUTTON}
                              disabled={index === 0}
                              onClick={() =>
                                setItems(moveItem(items, index, -1))
                              }
                              title="W górę"
                              type="button"
                            >
                              <ArrowUp aria-hidden="true" />
                            </button>
                            <button
                              aria-label={`Przesuń w dół: ${itemTitle(item, titles)}`}
                              className={DETAIL_BUTTON}
                              disabled={index === items.length - 1}
                              onClick={() =>
                                setItems(moveItem(items, index, 1))
                              }
                              title="W dół"
                              type="button"
                            >
                              <ArrowDown aria-hidden="true" />
                            </button>
                            <button
                              aria-label={`Usuń kartę: ${itemTitle(item, titles)}`}
                              className={DETAIL_BUTTON}
                              onClick={() =>
                                setItems(items.filter((_, at) => at !== index))
                              }
                              title="Usuń kartę"
                              type="button"
                            >
                              <Trash2 aria-hidden="true" />
                            </button>
                          </>
                        ) : null}
                      </div>
                      {item.kind === "card" && editable ? (
                        <CardFields
                          card={item}
                          index={index}
                          onChange={(card) =>
                            setItems(
                              items.map((one, at) =>
                                at === index ? card : one,
                              ),
                            )
                          }
                        />
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
              {editable ? (
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-end">
                  <SelectField
                    id="issue-add-article"
                    label="Artykuł"
                    onChange={setPickArticle}
                    options={[
                      {
                        value: "",
                        label: props.articles.length
                          ? "Wybierz artykuł…"
                          : "Brak opublikowanych artykułów",
                      },
                      ...props.articles.map((one) => ({
                        value: one.id,
                        label: one.title,
                      })),
                    ]}
                    value={pickArticle}
                  />
                  <Button
                    disabled={!pickArticle || full}
                    onClick={() => {
                      setItems([
                        ...items,
                        { kind: "article", id: pickArticle },
                      ]);
                      setPickArticle("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Dodaj artykuł
                  </Button>
                  <SelectField
                    id="issue-add-ebook"
                    label="E-book"
                    onChange={setPickEbook}
                    options={[
                      {
                        value: "",
                        label: props.ebooks.length
                          ? "Wybierz e-book…"
                          : "Brak opublikowanych e-booków",
                      },
                      ...props.ebooks.map((one) => ({
                        value: one.id,
                        label: one.title,
                      })),
                    ]}
                    value={pickEbook}
                  />
                  <Button
                    disabled={!pickEbook || full}
                    onClick={() => {
                      setItems([...items, { kind: "ebook", id: pickEbook }]);
                      setPickEbook("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Dodaj e-book
                  </Button>
                  <div className="lg:col-span-4">
                    <Button
                      disabled={full}
                      onClick={() => setItems([...items, emptyCard()])}
                      size="sm"
                      variant="outline"
                    >
                      Dodaj własną kartę (np. warsztat, wydarzenie)
                    </Button>
                  </div>
                </div>
              ) : null}
            </WorkspaceSection>

            <WorkspaceSection
              id="zakonczenie"
              note="opcjonalnie"
              title="Zakończenie"
            >
              {editable ? (
                <RichTextEditor
                  ariaLabel="Zakończenie wydania"
                  onChange={(closing) => change({ closing })}
                  placeholder="Na koniec: zaproszenie, podziękowanie, kontakt…"
                  value={draft.closing}
                />
              ) : (
                <p className="text-[0.8125rem] text-[var(--text-muted)]">
                  Treść jak w podglądzie obok.
                </p>
              )}
            </WorkspaceSection>
          </fieldset>

          <WorkspaceSection id="archiwum" title="Archiwum na stronie">
            <label className="flex items-start gap-2 text-sm">
              <input
                checked={draft.inArchive}
                className="mt-0.5 size-4 accent-[var(--primary)]"
                disabled={isPending}
                onChange={(event) => {
                  const inArchive = event.target.checked;
                  change({ inArchive });
                  if (!editable) {
                    run(
                      () => setIssueArchiveAction(id, inArchive),
                      inArchive
                        ? "Wydanie jest w archiwum"
                        : "Wydanie zniknęło z archiwum",
                      () => setSaved({ ...saved, inArchive }),
                    );
                  }
                }}
                type="checkbox"
              />
              <span>
                Pokaż to wydanie na stronie, w archiwum newslettera
                (/newsletter), po wysyłce.
                <span className="block text-[0.75rem] text-[var(--text-muted)]">
                  Archiwum pomaga w Google i pokazuje nowym osobom, czego się
                  spodziewać.
                </span>
              </span>
            </label>
          </WorkspaceSection>
        </div>

        <section
          aria-label="Podgląd wydania"
          className="flex min-h-[70vh] min-w-0 flex-col border-t border-[var(--border)] lg:min-h-0 lg:border-t-0 lg:border-l"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3.5 py-2">
            <h2 className="text-[0.9375rem] font-semibold">Podgląd e-maila</h2>
            <span className="text-[0.75rem] text-[var(--text-muted)]">
              {dirty
                ? "z niezapisanymi zmianami po odświeżeniu"
                : "tak zobaczą je odbiorcy"}
            </span>
            <Button
              className="ml-auto h-7 px-2.5 text-[0.8125rem]"
              disabled={previewing}
              loading={previewing}
              onClick={() => refreshPreview()}
              size="sm"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              Odśwież
            </Button>
          </div>
          {previewError ? (
            <p
              className="p-4 text-[0.8125rem] text-[var(--text-muted)]"
              role="alert"
            >
              {previewError}
            </p>
          ) : preview ? (
            <iframe
              className="min-h-[60vh] w-full flex-1 border-0 bg-white"
              sandbox=""
              srcDoc={preview.html}
              title="Wygląd wydania w skrzynce"
            />
          ) : (
            <p className="p-4 text-[0.8125rem] text-[var(--text-muted)]">
              Wczytywanie podglądu…
            </p>
          )}
        </section>
      </div>

      <AlertDialog
        onOpenChange={(open) => setAsking(open ? asking : null)}
        open={asking !== null}
      >
        <AlertDialogContent>
          {asking === "send" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Wysłać „{draft.subject.trim()}”?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Wydanie pójdzie do wszystkich zapisanych i potwierdzonych
                  adresów (teraz: {props.subscribers}). Po wysyłce treści nie da
                  się już zmienić. Najpierw warto wysłać test na swój adres.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <fieldset className="grid gap-2 text-sm">
                <legend className="sr-only">Kiedy wysłać</legend>
                <label className="flex items-center gap-2">
                  <input
                    checked={when === "now"}
                    className="size-4 accent-[var(--primary)]"
                    name="when"
                    onChange={() => setWhen("now")}
                    type="radio"
                  />
                  Teraz
                </label>
                <label className="flex items-center gap-2">
                  <input
                    checked={when === "later"}
                    className="size-4 accent-[var(--primary)]"
                    name="when"
                    onChange={() => setWhen("later")}
                    type="radio"
                  />
                  O wybranej godzinie
                </label>
                {when === "later" ? (
                  <div className="flex flex-wrap gap-3 pl-6">
                    <label className="grid gap-1">
                      <span className="text-[0.75rem] text-[var(--text-muted)]">
                        Dzień
                      </span>
                      <input
                        className="rounded-[var(--radius-control)] border border-[var(--border)] px-2 py-1"
                        onChange={(event) =>
                          setLater({ ...later, date: event.target.value })
                        }
                        type="date"
                        value={later.date}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[0.75rem] text-[var(--text-muted)]">
                        Godzina (czas polski)
                      </span>
                      <input
                        className="rounded-[var(--radius-control)] border border-[var(--border)] px-2 py-1"
                        onChange={(event) =>
                          setLater({ ...later, time: event.target.value })
                        }
                        step={300}
                        type="time"
                        value={later.time}
                      />
                    </label>
                  </div>
                ) : null}
              </fieldset>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    send();
                    setAsking(null);
                  }}
                >
                  {when === "now" ? "Wyślij teraz" : "Zaplanuj wysyłkę"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : asking === "cancel" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Wycofać zaplanowaną wysyłkę?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Wydanie nie wyjdzie i wróci do szkiców, żeby można je było
                  poprawić i wysłać ponownie.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zostaw</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    run(() => cancelIssueAction(id), "Wysyłka wycofana");
                    setAsking(null);
                  }}
                >
                  Wycofaj wysyłkę
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Usunąć to wydanie?</AlertDialogTitle>
                <AlertDialogDescription>
                  Szkic zniknie na zawsze, razem z treścią.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    run(() => deleteIssueAction(id), "Usunięto wydanie");
                    setAsking(null);
                  }}
                >
                  Usuń wydanie
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardFields({
  card,
  index,
  onChange,
}: {
  card: NewsletterCard;
  index: number;
  onChange: (card: NewsletterCard) => void;
}) {
  const id = `issue-card-${index}`;
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      <TextField
        id={`${id}-title`}
        label="Tytuł"
        maxLength={NEWSLETTER_ISSUE_LIMITS.cardTitle}
        onChange={(title) => onChange({ ...card, title })}
        value={card.title}
      />
      <TextField
        hint="Strona centrum od /, np. /warsztaty, albo pełny adres https://"
        id={`${id}-href`}
        label="Link (opcjonalnie)"
        maxLength={2048}
        onChange={(href) => onChange({ ...card, href })}
        value={card.href}
      />
      <TextField
        className="lg:col-span-2"
        id={`${id}-text`}
        label="Opis"
        maxLength={NEWSLETTER_ISSUE_LIMITS.cardText}
        multiline
        onChange={(text) => onChange({ ...card, text })}
        rows={2}
        value={card.text}
      />
      <TextField
        hint="Domyślnie „Dowiedz się więcej”."
        id={`${id}-label`}
        label="Napis na przycisku (opcjonalnie)"
        maxLength={NEWSLETTER_ISSUE_LIMITS.cardLabel}
        onChange={(label) => onChange({ ...card, label })}
        value={card.label}
      />
    </div>
  );
}
