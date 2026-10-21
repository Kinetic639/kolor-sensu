import type { ArticleDocument } from "@repo/contracts/article-rich-text";
import type { Editor, Range } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
// The table commands (insertTable) and their types.
import type {} from "@tiptap/extension-table";
import { canonicalizeEditorJson } from "../rich-text-editor";

// What the author can insert into an article, the same list behind the
// "/" menu and the "Wstaw" button; moving a block up or down (the keyboard
// and single-click way to do what dragging does, WCAG 2.5.7); and the
// editor's JSON reduced to the article contract's keys.

export interface ArticleBlockCommand {
  id: string;
  label: string;
  /** Words the "/" menu also finds it by. */
  keywords: string;
  /** Runs it; `range` is the "/…" typed, removed first. */
  run: (editor: Editor, range?: Range) => void;
}

/** What the editor needs from its host to insert images. */
export interface ArticleImagePicker {
  /** Asks for one image, or two, and inserts them once uploaded. */
  pick: (count: 1 | 2) => void;
}

const start = (editor: Editor, range?: Range) => {
  const chain = editor.chain().focus();
  return range ? chain.deleteRange(range) : chain;
};

export function articleBlockCommands(
  images: ArticleImagePicker,
): ArticleBlockCommand[] {
  return [
    {
      id: "h2",
      label: "Śródtytuł",
      keywords: "naglowek h2 srodtytul",
      run: (editor, range) =>
        start(editor, range).setHeading({ level: 2 }).run(),
    },
    {
      id: "h3",
      label: "Mniejszy śródtytuł",
      keywords: "naglowek h3",
      run: (editor, range) =>
        start(editor, range).setHeading({ level: 3 }).run(),
    },
    {
      id: "image",
      label: "Zdjęcie, grafika lub wykres",
      keywords: "zdjecie obraz grafika wykres image",
      run: (editor, range) => {
        start(editor, range).run();
        images.pick(1);
      },
    },
    {
      id: "image-pair",
      label: "Dwa zdjęcia obok siebie",
      keywords: "zdjecia dwa obok para",
      run: (editor, range) => {
        start(editor, range).run();
        images.pick(2);
      },
    },
    ...(["important", "tip", "warning"] as const).map((kind) => ({
      id: `callout-${kind}`,
      label: {
        important: "Ramka „Ważne”",
        tip: "Ramka „Wskazówka”",
        warning: "Ramka „Uwaga”",
      }[kind],
      keywords: `ramka ${kind} wazne wskazowka uwaga`,
      run: (editor: Editor, range?: Range) =>
        start(editor, range)
          .insertContent({
            type: "callout",
            attrs: { kind },
            content: [{ type: "paragraph" }],
          })
          .run(),
    })),
    {
      id: "pull-quote",
      label: "Wyróżniony cytat",
      keywords: "cytat wyrozniony autor",
      run: (editor, range) =>
        start(editor, range)
          .insertContent({
            type: "pullQuote",
            attrs: { author: null },
            content: [{ type: "paragraph" }],
          })
          .run(),
    },
    {
      id: "table",
      label: "Tabela",
      keywords: "tabela table",
      run: (editor, range) =>
        start(editor, range)
          .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
          .run(),
    },
    {
      id: "bullet-list",
      label: "Lista",
      keywords: "lista punkty",
      run: (editor, range) => start(editor, range).toggleBulletList().run(),
    },
    {
      id: "ordered-list",
      label: "Lista numerowana",
      keywords: "lista numerowana",
      run: (editor, range) => start(editor, range).toggleOrderedList().run(),
    },
    {
      id: "rule",
      label: "Linia oddzielająca",
      keywords: "linia separator",
      run: (editor, range) => start(editor, range).setHorizontalRule().run(),
    },
    {
      id: "booking",
      label: "Przycisk „Umów wizytę”",
      keywords: "przycisk umow wizyte rezerwacja",
      run: (editor, range) =>
        start(editor, range)
          .insertContent({
            type: "bookingButton",
            attrs: { label: "Umów wizytę", service: null },
          })
          .run(),
    },
  ];
}

/** The "/" menu's matches for what was typed after the slash. */
export function matchCommands(
  commands: readonly ArticleBlockCommand[],
  query: string,
): ArticleBlockCommand[] {
  const fold = (value: string) =>
    value.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const wanted = fold(query.trim());
  return commands.filter(
    (command) =>
      !wanted ||
      fold(command.label).includes(wanted) ||
      command.keywords.includes(wanted),
  );
}

/**
 * Moves the top-level block holding the selection one place up or down;
 * false when it is already first or last.
 */
export function moveBlock(editor: Editor, direction: -1 | 1): boolean {
  const { state } = editor;
  const { selection } = state;
  const index = selection.$from.index(0);
  const sibling = index + direction;
  if (sibling < 0 || sibling >= state.doc.childCount) return false;
  const node = state.doc.child(index);
  const other = state.doc.child(sibling);
  let pos = 0;
  for (let at = 0; at < Math.min(index, sibling); at++) {
    pos += state.doc.child(at).nodeSize;
  }
  const [first, second] = direction === 1 ? [node, other] : [other, node];
  const tr = state.tr.replaceWith(pos, pos + first.nodeSize + second.nodeSize, [
    second,
    first,
  ]);
  const movedStart = direction === 1 ? pos + second.nodeSize : pos;
  if (selection instanceof NodeSelection) {
    tr.setSelection(NodeSelection.create(tr.doc, movedStart));
  } else {
    const offset = selection.$from.pos - selection.$from.before(1);
    tr.setSelection(
      TextSelection.near(
        tr.doc.resolve(Math.min(movedStart + offset, tr.doc.content.size)),
      ),
    );
  }
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

type Json = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Json[];
};

const ARTICLE_ATTRS: Record<string, readonly string[]> = {
  articleImage: ["src", "alt", "width", "height", "caption", "size"],
  articleImagePair: ["images", "caption"],
  callout: ["kind"],
  pullQuote: ["author"],
  bookingButton: ["label", "service"],
  tableCell: ["colspan", "rowspan", "colwidth"],
  tableHeader: ["colspan", "rowspan", "colwidth"],
};

const CONTAINERS = new Set(["doc", "table", "tableRow"]);

/**
 * The editor's JSON reduced to the article contract's keys: the article's
 * blocks with their own attributes only, everything else as the base
 * editor reduces it.
 */
export function canonicalizeArticleJson(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("type" in value)) return value;
  const node = value as Json;
  const keys = ARTICLE_ATTRS[node.type];
  if (keys || CONTAINERS.has(node.type)) {
    const attrs = keys
      ? Object.fromEntries(keys.map((key) => [key, node.attrs?.[key] ?? null]))
      : undefined;
    if (attrs && "colspan" in attrs) {
      attrs.colspan ??= 1;
      attrs.rowspan ??= 1;
    }
    return {
      type: node.type,
      ...(attrs ? { attrs } : {}),
      ...(node.content?.length
        ? { content: node.content.map(canonicalizeArticleJson) }
        : {}),
    };
  }
  return canonicalizeEditorJson(value);
}

/** The editor's JSON as an article document (not yet checked). */
export function articleJson(editor: Editor): ArticleDocument {
  return canonicalizeArticleJson(editor.getJSON()) as ArticleDocument;
}
