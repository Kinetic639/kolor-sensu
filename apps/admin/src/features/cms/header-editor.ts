import type {
  DescriptionPart,
  HeaderCta,
  HeaderTone,
  HeaderHref,
  PageHeaderContent,
  SectionHeaderContent,
  TitleSegment,
} from "@repo/contracts";

// The header editor's working copy (header-editor-form.tsx) and its way to
// and from the stored header (@repo/contracts/section-header). The editor
// works in words and plain text: a title line is its text and a colour per
// word; the description is its text and, at most, one link over a stretch
// of it. Pure functions, no DOM.

export interface TitleLineDraft {
  text: string;
  /** One colour per word of the text, in order. */
  tones: HeaderTone[];
}

export interface LinkDraft {
  /** Where the linked words sit in the description's text. */
  start: number;
  end: number;
  href: HeaderHref;
  tone: HeaderTone;
}

export interface HeaderDraft {
  eyebrow: { text: string; tone: HeaderTone };
  lines: TitleLineDraft[];
  description: { text: string; link: LinkDraft | null };
  cta: HeaderCta | null;
}

/** The colour a click on a word gives it next. */
export const NEXT_TONE: Record<HeaderTone, HeaderTone> = {
  default: "pink",
  pink: "green",
  green: "default",
};

/** A text's words, as the editor counts them. */
export function wordsOf(text: string): string[] {
  return text.match(/\S+/g) ?? [];
}

export function lineToDraft(line: readonly TitleSegment[]): TitleLineDraft {
  const tones: HeaderTone[] = [];
  let text = "";
  for (const segment of line) {
    // A word takes the colour of the run it starts in.
    for (const match of segment.text.matchAll(/\S+/g)) {
      const startsHere = match.index > 0 || text === "" || /\s$/.test(text);
      if (startsHere) tones.push(segment.tone);
    }
    text += segment.text;
  }
  return { text, tones };
}

/** A line's text and word colours as runs: words of one colour together. */
export function draftToLine({ text, tones }: TitleLineDraft): TitleSegment[] {
  const segments: TitleSegment[] = [];
  let word = 0;
  for (const token of text.trim().match(/\S+|\s+/g) ?? []) {
    const last = segments.at(-1);
    if (/^\s/.test(token)) {
      // A space joins the run before it.
      if (last) last.text += " ";
      continue;
    }
    const tone = tones[word++] ?? "default";
    if (last && last.tone === tone) last.text += token;
    else segments.push({ text: token, tone });
  }
  return segments;
}

/**
 * The colours of a line's words after its text changed: a word keeps its
 * colour if it is still there (in the same order); new words are plain.
 */
export function retone(before: TitleLineDraft, text: string): TitleLineDraft {
  const old = wordsOf(before.text);
  const tones: HeaderTone[] = [];
  let from = 0;
  for (const word of wordsOf(text)) {
    const at = old.indexOf(word, from);
    if (at === -1) {
      tones.push("default");
    } else {
      tones.push(before.tones[at] ?? "default");
      from = at + 1;
    }
  }
  return { text, tones };
}

export function descriptionToDraft(
  parts: readonly DescriptionPart[],
): HeaderDraft["description"] {
  let text = "";
  let link: LinkDraft | null = null;
  for (const part of parts) {
    if (part.link) {
      link = {
        start: text.length,
        end: text.length + part.text.length,
        href: part.link.href,
        tone: part.link.tone,
      };
    }
    text += part.text;
  }
  return { text, link };
}

export function draftToDescription({
  text,
  link,
}: HeaderDraft["description"]): DescriptionPart[] {
  if (text.trim() === "") return [];
  if (!link || link.end <= link.start)
    return [{ text: text.trim(), link: null }];
  const before = text.slice(0, link.start).trimStart();
  const linked = text.slice(link.start, link.end);
  const after = text.slice(link.end).trimEnd();
  return [
    ...(before ? [{ text: before, link: null }] : []),
    { text: linked, link: { href: link.href, tone: link.tone } },
    ...(after ? [{ text: after, link: null }] : []),
  ];
}

/**
 * The link's place after the description's text changed: where its words
 * still are (the nearest place to where they were); gone with them.
 */
export function moveLink(
  before: string,
  text: string,
  link: LinkDraft | null,
): LinkDraft | null {
  if (!link) return null;
  const words = before.slice(link.start, link.end);
  if (!words) return null;
  let best = -1;
  for (
    let at = text.indexOf(words);
    at !== -1;
    at = text.indexOf(words, at + 1)
  ) {
    if (best === -1 || Math.abs(at - link.start) < Math.abs(best - link.start))
      best = at;
  }
  return best === -1
    ? null
    : { ...link, start: best, end: best + words.length };
}

/**
 * A link over the selected stretch, without the spaces at its ends; none
 * when nothing but spaces is selected.
 */
export function linkOver(
  text: string,
  start: number,
  end: number,
  href: HeaderHref,
): LinkDraft | null {
  let from = Math.min(start, end);
  let to = Math.max(start, end);
  while (from < to && /\s/.test(text[from]!)) from++;
  while (to > from && /\s/.test(text[to - 1]!)) to--;
  return to > from ? { start: from, end: to, href, tone: "default" } : null;
}

export function headerToDraft(header: SectionHeaderContent): HeaderDraft {
  return {
    eyebrow: { ...header.eyebrow },
    lines: header.title.map(lineToDraft),
    description: descriptionToDraft(header.description),
    cta: header.cta ? { ...header.cta } : null,
  };
}

/** The header to store (validate it with sectionHeaderSchema). */
export function draftToHeader(draft: HeaderDraft): SectionHeaderContent {
  return {
    eyebrow: { text: draft.eyebrow.text.trim(), tone: draft.eyebrow.tone },
    title: draft.lines.map(draftToLine),
    description: draftToDescription(draft.description),
    cta: draft.cta,
  };
}

const EMPTY_LINE: TitleLineDraft = { text: "", tones: [] };

/** A page's header in the editor: always its two title lines. */
export function pageHeaderToDraft(header: SectionHeaderContent): HeaderDraft {
  const draft = headerToDraft(header);
  return {
    ...draft,
    lines: [draft.lines[0] ?? EMPTY_LINE, draft.lines[1] ?? EMPTY_LINE],
    cta: null,
  };
}

/**
 * A page's header to store (validate it with pageHeaderSchema): an empty
 * second line left out, and no call to action.
 */
export function draftToPageHeader(draft: HeaderDraft): PageHeaderContent {
  const header = draftToHeader(draft);
  return {
    ...header,
    title: header.title.filter((line, at) => at === 0 || line.length > 0),
    cta: null,
  };
}
