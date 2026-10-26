"use client";

import { useSave } from "@/lib/use-save";
import {
  bookedService,
  CTA_STYLES,
  HEADER_LIMITS,
  PAGE_HEADER_LIMITS,
  sectionHeaderSchema,
  SITE_PAGES,
  type CtaStyle,
  type HeaderHref,
  type HeaderTone,
  type HomeHeaderSection,
  type PageHeaderContent,
  type SectionHeaderContent,
  serviceBookingHref,
} from "@repo/contracts";
import type { AboutHeaderSection } from "@repo/contracts/cms-pages";
import { Button } from "@repo/ui/button";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import { Link2, Plus, X } from "lucide-react";
import { createContext, useContext, useId, useState } from "react";
import {
  updateAboutHeaderDraftAction,
  updateHomeHeaderDraftAction,
} from "./actions";
import {
  draftToHeader,
  draftToPageHeader,
  headerToDraft,
  pageHeaderToDraft,
  linkOver,
  moveLink,
  NEXT_TONE,
  retone,
  type HeaderDraft,
} from "./header-editor";

// A section's header in the CMS ("Nagłówek"): the eyebrow and its colour,
// the title's one or two lines (a click on a word changes its colour), the
// description with one link over any words of it, and a call to action.
// Words and colours only: the heading's level and size are the site's.
// A preview shows it in the site's colours. Saved as the draft of the
// homepage's headers; the page bar publishes.

// The site's colours (packages/design-system/src/public-theme.css), for
// the preview only: large title words in the light shades, small text
// (eyebrow, link) in the strong ones, as on the site.
const PREVIEW = {
  ink: "#16302f",
  muted: "#566461",
  large: { default: "#16302f", green: "#527b57", pink: "#b86e6b" },
  small: { default: "#566461", green: "#45684a", pink: "#9c5754" },
  link: { default: "#16302f", green: "#45684a", pink: "#9c5754" },
} as const;

const TONE_LABELS: Record<HeaderTone, string> = {
  default: "Zwykły",
  green: "Zielony",
  pink: "Różowy",
};

const CTA_LABELS: Record<CtaStyle, string> = {
  button: "Zielony przycisk",
  outline: "Przycisk z obwódką",
  arrow: "Link ze strzałką",
};

/** A service a header can link to booking (bookable online). */
export interface BookableService {
  slug: string;
  name: string;
  /** The client fills in the questionnaire first. */
  requiresIntake: boolean;
}

const BookableServices = createContext<readonly BookableService[]>([]);

function useHrefLabel() {
  const services = useContext(BookableServices);
  return (href: string) => {
    const slug = bookedService(href);
    if (slug) {
      const name = services.find((service) => service.slug === slug)?.name;
      return `Umów: ${name ?? slug}`;
    }
    return SITE_PAGES.find((page) => page.href === href)?.label ?? href;
  };
}

export function HeaderBlock({
  page = "home",
  section,
  header,
  services,
}: {
  /** Whose headers it saves into: the homepage's or O nas's. */
  page?: "home" | "about";
  section: HomeHeaderSection | AboutHeaderSection;
  header: SectionHeaderContent;
  /** What a link or the call to action may book. */
  services: readonly BookableService[];
}) {
  const id = useId();
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState<HeaderDraft>(() => headerToDraft(header));
  const [saved, setSaved] = useState(() => JSON.stringify(header));
  const [problem, setProblem] = useState<string | null>(null);
  const current = draftToHeader(draft);
  const dirty = JSON.stringify(current) !== saved;

  function change(patch: Partial<HeaderDraft>) {
    setDraft((before) => ({ ...before, ...patch }));
    setProblem(null);
  }

  function save() {
    const result = sectionHeaderSchema.safeParse(current);
    if (!result.success) {
      setProblem(result.error.issues[0]?.message ?? "Popraw nagłówek");
      return;
    }
    run(
      () =>
        page === "about"
          ? updateAboutHeaderDraftAction(
              section as AboutHeaderSection,
              result.data,
            )
          : updateHomeHeaderDraftAction(
              section as HomeHeaderSection,
              result.data,
            ),
      "Zapisano szkic nagłówka",
      () => setSaved(JSON.stringify(result.data)),
    );
  }

  return (
    <BookableServices.Provider value={services}>
      <div className="grid gap-3 border-b border-[var(--border)] px-3.5 py-3">
        <p className="m-0 text-[0.75rem] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
          Nagłówek
        </p>
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="grid content-start gap-3.5">
            <EyebrowField
              id={`${id}-eyebrow`}
              onChange={(eyebrow) => change({ eyebrow })}
              value={draft.eyebrow}
            />
            <TitleField
              id={`${id}-title`}
              lines={draft.lines}
              onChange={(lines) => change({ lines })}
            />
            <DescriptionField
              id={`${id}-description`}
              onChange={(description) => change({ description })}
              value={draft.description}
            />
            <CtaField
              id={`${id}-cta`}
              onChange={(cta) => change({ cta })}
              value={draft.cta}
            />
          </div>
          <Preview header={current} />
        </div>
        <div className="flex items-center justify-end gap-3">
          {problem ? (
            <span className="text-[0.75rem] text-[var(--danger)]" role="alert">
              {problem}
            </span>
          ) : dirty ? (
            <span className="text-[0.75rem] text-[var(--text-muted)]">
              Niezapisane zmiany
            </span>
          ) : null}
          <Button
            className="h-7 px-2.5 text-[0.8125rem]"
            disabled={!dirty}
            loading={isPending}
            onClick={save}
            size="sm"
            type="button"
          >
            Zapisz nagłówek
          </Button>
        </div>
      </div>
    </BookableServices.Provider>
  );
}

/**
 * A page's header (its top: the h1) as the sections' headers are edited:
 * the eyebrow and its colour, the title's two lines (the second optional;
 * a click on a word changes its colour) and the description with one link,
 * with a preview. No call to action. Part of the page's form: it reports
 * every change; the form saves the draft.
 */
export function PageHeaderFields({
  id,
  value,
  onChange,
  problem,
  leadHint,
}: {
  id: string;
  value: PageHeaderContent;
  onChange: (header: PageHeaderContent) => void;
  /** What the page's check found wrong with the header, if anything. */
  problem?: string | null;
  leadHint?: string;
}) {
  const [draft, setDraft] = useState<HeaderDraft>(() =>
    pageHeaderToDraft(value),
  );
  function change(patch: Partial<HeaderDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(draftToPageHeader(next));
  }
  return (
    <BookableServices.Provider value={[]}>
      <div className="grid gap-3.5 px-3.5 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="grid content-start gap-3.5">
          <EyebrowField
            id={`${id}-eyebrow`}
            onChange={(eyebrow) => change({ eyebrow })}
            value={draft.eyebrow}
          />
          <TitleField
            id={`${id}-title`}
            lines={draft.lines}
            onChange={(lines) => change({ lines })}
            page
          />
          <DescriptionField
            hint={leadHint}
            id={`${id}-description`}
            maxLength={PAGE_HEADER_LIMITS.description}
            onChange={(description) => change({ description })}
            value={draft.description}
          />
          {problem ? (
            <p className="m-0 text-[0.75rem] text-[var(--danger)]" role="alert">
              {problem}
            </p>
          ) : null}
        </div>
        <Preview header={draftToPageHeader(draft)} />
      </div>
    </BookableServices.Provider>
  );
}

/** Shared title-only controls for sections whose body is edited separately. */
export function SectionTitleFields({
  id,
  value,
  onChange,
  problem,
  titleMaxLength = HEADER_LIMITS.title,
}: {
  id: string;
  value: Pick<SectionHeaderContent, "eyebrow" | "title">;
  onChange: (header: Pick<SectionHeaderContent, "eyebrow" | "title">) => void;
  problem?: string | null;
  titleMaxLength?: number;
}) {
  const [draft, setDraft] = useState<HeaderDraft>(() =>
    headerToDraft({ ...value, description: [], cta: null }),
  );
  function change(patch: Partial<HeaderDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    const header = draftToHeader(next);
    onChange({ eyebrow: header.eyebrow, title: header.title });
  }
  return (
    <div className="grid gap-3.5 px-3.5 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="grid content-start gap-3.5">
        <EyebrowField
          id={`${id}-eyebrow`}
          value={draft.eyebrow}
          onChange={(eyebrow) => change({ eyebrow })}
        />
        <TitleField
          id={`${id}-title`}
          lines={draft.lines}
          onChange={(lines) => change({ lines })}
          maxLength={titleMaxLength}
        />
        {problem ? (
          <p role="alert" className="text-[0.75rem] text-[var(--danger)]">
            {problem}
          </p>
        ) : null}
      </div>
      <Preview header={draftToHeader(draft)} />
    </div>
  );
}

function ToneChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: HeaderTone;
  onChange: (tone: HeaderTone) => void;
}) {
  return (
    <div aria-label={label} className="flex gap-1" role="group">
      {(Object.keys(TONE_LABELS) as HeaderTone[]).map((tone) => (
        <button
          aria-pressed={value === tone}
          className={cn(
            DETAIL_BUTTON,
            "gap-1 px-2",
            value === tone &&
              "border-[var(--primary)] bg-[var(--surface-muted)]",
          )}
          key={tone}
          onClick={() => onChange(tone)}
          type="button"
        >
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ background: PREVIEW.small[tone] }}
          />
          {TONE_LABELS[tone]}
        </button>
      ))}
    </div>
  );
}

function EyebrowField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: HeaderDraft["eyebrow"];
  onChange: (eyebrow: HeaderDraft["eyebrow"]) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Nadtytuł (opcjonalnie)</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="min-w-0 flex-1"
          id={id}
          maxLength={HEADER_LIMITS.eyebrow}
          onChange={(event) => onChange({ ...value, text: event.target.value })}
          value={value.text}
        />
        <ToneChoice
          label="Kolor nadtytułu"
          onChange={(tone) => onChange({ ...value, tone })}
          value={value.tone}
        />
      </div>
    </div>
  );
}

function TitleField({
  id,
  lines,
  onChange,
  page = false,
  maxLength,
}: {
  id: string;
  lines: HeaderDraft["lines"];
  onChange: (lines: HeaderDraft["lines"]) => void;
  /** A page's title: always two lines (the second optional), none added. */
  page?: boolean;
  maxLength?: number;
}) {
  const setLine = (index: number, line: HeaderDraft["lines"][number]) =>
    onChange(lines.map((one, at) => (at === index ? line : one)));
  return (
    <div className="grid gap-2">
      {lines.map((line, index) => {
        const words = line.text.match(/\S+/g) ?? [];
        return (
          <div className="grid gap-1.5" key={index}>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${id}-${index}`}>
                {lines.length > 1 ? `Tytuł, wiersz ${index + 1}` : "Tytuł"}
                {page && index > 0 ? " (opcjonalnie)" : ""}
              </Label>
              {index > 0 && !page ? (
                <button
                  className={DETAIL_BUTTON}
                  onClick={() => onChange(lines.slice(0, 1))}
                  type="button"
                >
                  <X aria-hidden="true" />
                  Usuń wiersz
                </button>
              ) : null}
            </div>
            <Input
              id={`${id}-${index}`}
              maxLength={
                maxLength ??
                (page ? PAGE_HEADER_LIMITS.title : HEADER_LIMITS.title)
              }
              onChange={(event) =>
                setLine(index, retone(line, event.target.value))
              }
              value={line.text}
            />
            {words.length > 0 ? (
              <div
                aria-label={`Kolory słów ${lines.length > 1 ? `wiersza ${index + 1}` : "tytułu"}`}
                className="flex flex-wrap gap-1"
                role="group"
              >
                {words.map((word, at) => {
                  const tone = line.tones[at] ?? "default";
                  return (
                    <button
                      aria-label={`${word}: ${TONE_LABELS[tone].toLowerCase()}`}
                      className="rounded-[4px] border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[0.8125rem] font-medium hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                      key={`${word}-${at}`}
                      onClick={() =>
                        setLine(index, {
                          ...line,
                          tones: words.map((_, which) =>
                            which === at
                              ? NEXT_TONE[tone]
                              : (line.tones[which] ?? "default"),
                          ),
                        })
                      }
                      style={{ color: PREVIEW.large[tone] }}
                      type="button"
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        {lines.length < 2 && !page ? (
          <button
            className={DETAIL_BUTTON}
            onClick={() => onChange([...lines, { text: "", tones: [] }])}
            type="button"
          >
            <Plus aria-hidden="true" />
            Drugi wiersz
          </button>
        ) : null}
        <span className="text-[0.75rem] text-[var(--text-muted)]">
          Kliknij słowo, aby zmienić jego kolor: zwykły → różowy → zielony.
        </span>
      </div>
    </div>
  );
}

function DescriptionField({
  id,
  value,
  onChange,
  maxLength = HEADER_LIMITS.description,
  hint,
}: {
  id: string;
  value: HeaderDraft["description"];
  onChange: (description: HeaderDraft["description"]) => void;
  maxLength?: number;
  hint?: string;
}) {
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const link = value.link;
  const canLink = !link && selection !== null && selection[0] !== selection[1];

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Opis pod tytułem (opcjonalnie)</Label>
      {hint ? (
        <p
          className="m-0 text-[0.75rem] text-[var(--text-muted)]"
          id={`${id}-hint`}
        >
          {hint}
        </p>
      ) : null}
      <Textarea
        aria-describedby={hint ? `${id}-hint` : undefined}
        id={id}
        maxLength={maxLength}
        onChange={(event) =>
          onChange({
            text: event.target.value,
            link: moveLink(value.text, event.target.value, link),
          })
        }
        onSelect={(event) =>
          setSelection([
            event.currentTarget.selectionStart,
            event.currentTarget.selectionEnd,
          ])
        }
        rows={3}
        value={value.text}
      />
      {link ? (
        <div className="grid gap-2 rounded-[5px] border border-[var(--border)] p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[0.8125rem]">
              Link: „<strong>{value.text.slice(link.start, link.end)}</strong>”
            </span>
            <button
              className={DETAIL_BUTTON}
              onClick={() => onChange({ ...value, link: null })}
              type="button"
            >
              <X aria-hidden="true" />
              Usuń link
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PageSelect
              id={`${id}-link-page`}
              label="Strona linku"
              onChange={(href) =>
                onChange({ ...value, link: { ...link, href } })
              }
              value={link.href}
            />
            <ToneChoice
              label="Kolor linku"
              onChange={(tone) =>
                onChange({ ...value, link: { ...link, tone } })
              }
              value={link.tone}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={DETAIL_BUTTON}
            disabled={!canLink}
            onClick={() => {
              if (!selection) return;
              const made = linkOver(
                value.text,
                selection[0],
                selection[1],
                "/oferta",
              );
              if (made) onChange({ ...value, link: made });
              document.getElementById(id)?.focus();
            }}
            type="button"
          >
            <Link2 aria-hidden="true" />
            Zrób link z zaznaczenia
          </button>
          <span className="text-[0.75rem] text-[var(--text-muted)]">
            Zaznacz w opisie słowa, które mają prowadzić do innej strony.
          </span>
        </div>
      )}
    </div>
  );
}

function PageSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: HeaderHref;
  onChange: (href: HeaderHref) => void;
}) {
  const services = useContext(BookableServices);
  const hrefLabel = useHrefLabel();
  return (
    <div className="grid gap-1">
      <Label className="sr-only" htmlFor={id}>
        {label}
      </Label>
      <Select
        onValueChange={(href) => onChange(href as HeaderHref)}
        value={value}
      >
        <SelectTrigger aria-label={label} className="h-[26px] w-56" id={id}>
          <SelectValue>{hrefLabel(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Strony</SelectLabel>
            {SITE_PAGES.map((page) => (
              <SelectItem key={page.href} value={page.href}>
                {page.label}
              </SelectItem>
            ))}
          </SelectGroup>
          {services.length > 0 ? (
            <SelectGroup>
              <SelectLabel>Umów wybraną usługę</SelectLabel>
              {services.map((service) => (
                <SelectItem
                  key={service.slug}
                  value={serviceBookingHref(service.slug)}
                >
                  {service.name}
                  {service.requiresIntake ? " (najpierw ankieta)" : ""}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}

function CtaField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: HeaderDraft["cta"];
  onChange: (cta: HeaderDraft["cta"]) => void;
}) {
  return (
    <div className="grid gap-2">
      <label className="flex items-center justify-between gap-3">
        <span className="text-[0.8125rem] font-semibold text-[var(--text)]">
          Przycisk pod opisem
        </span>
        <Switch
          aria-label="Przycisk pod opisem"
          checked={value !== null}
          onCheckedChange={(on) =>
            onChange(
              on
                ? {
                    label: "Umów wizytę",
                    href: "/umow-wizyte",
                    style: "button",
                  }
                : null,
            )
          }
          size="sm"
        />
      </label>
      {value ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid min-w-40 flex-1 gap-1.5">
            <Label htmlFor={`${id}-label`}>Tekst przycisku</Label>
            <Input
              id={`${id}-label`}
              maxLength={HEADER_LIMITS.ctaLabel}
              onChange={(event) =>
                onChange({ ...value, label: event.target.value })
              }
              value={value.label}
            />
          </div>
          <PageSelect
            id={`${id}-page`}
            label="Strona przycisku"
            onChange={(href) => onChange({ ...value, href })}
            value={value.href}
          />
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor={`${id}-style`}>
              Wygląd przycisku
            </Label>
            <Select
              onValueChange={(style) =>
                onChange({ ...value, style: style as CtaStyle })
              }
              value={value.style}
            >
              <SelectTrigger
                aria-label="Wygląd przycisku"
                className="h-[26px] w-44"
                id={`${id}-style`}
              >
                <SelectValue>{CTA_LABELS[value.style]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CTA_STYLES.map((style) => (
                  <SelectItem key={style} value={style}>
                    {CTA_LABELS[style]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** The header in the site's colours, roughly as the section shows it. */
function Preview({ header }: { header: SectionHeaderContent }) {
  const { eyebrow, title, description, cta } = header;
  const pageLabel = useHrefLabel();
  return (
    <div
      aria-label="Podgląd nagłówka"
      className="grid content-start gap-2 rounded-[5px] border border-[var(--border)] p-3.5"
      role="figure"
      style={{ background: "#f8f7f3", color: PREVIEW.ink }}
    >
      <span className="text-[0.6875rem] font-medium text-[var(--text-muted)]">
        Podgląd
      </span>
      {eyebrow.text ? (
        <p
          className="m-0 text-[0.6875rem] tracking-[0.2em] uppercase"
          style={{ color: PREVIEW.small[eyebrow.tone] }}
        >
          {eyebrow.text}
        </p>
      ) : null}
      <p className="m-0 font-serif text-[1.375rem] leading-tight">
        {title.map((line, index) => (
          <span className="block" key={index}>
            {line.map((segment, at) => (
              <span key={at} style={{ color: PREVIEW.large[segment.tone] }}>
                {segment.text}
              </span>
            ))}
          </span>
        ))}
      </p>
      {description.length > 0 ? (
        <p className="m-0 text-[0.8125rem]" style={{ color: PREVIEW.muted }}>
          {description.map((part, at) =>
            part.link ? (
              <span
                className="font-semibold underline underline-offset-2"
                key={at}
                style={{ color: PREVIEW.link[part.link.tone] }}
                title={`→ ${pageLabel(part.link.href)}`}
              >
                {part.text}
              </span>
            ) : (
              <span key={at}>{part.text}</span>
            ),
          )}
        </p>
      ) : null}
      {cta ? (
        <span
          className={cn(
            "mt-1 justify-self-start text-[0.75rem] font-semibold",
            cta.style === "button" &&
              "rounded-full bg-[#527b57] px-3 py-1.5 text-white",
            cta.style === "outline" &&
              "rounded-full border border-[#7a8a87] px-3 py-1.5",
            cta.style === "arrow" && "underline underline-offset-4",
          )}
          title={`→ ${pageLabel(cta.href)}`}
        >
          {cta.label} →
        </span>
      ) : null}
    </div>
  );
}
