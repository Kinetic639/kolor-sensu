"use client";

import {
  ARTICLE_IMAGE_WIDTHS,
  ARTICLE_LIMITS,
  CALLOUT_KINDS,
  CALLOUT_LABELS,
  type ArticleImageFile,
  type ArticleImageWidth,
  type CalloutKind,
} from "@repo/contracts/article-rich-text";
import { mergeAttributes, Node } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { Trash2 } from "lucide-react";
import { useId, type ReactNode } from "react";

// The article's own blocks in the editor (docs/architecture/rich-text-
// platform.md): each a Tiptap node with the contract's attributes only,
// and, where the author sets something (an image's text, a box's kind,
// who said a quote), a small form in its place. What it looks like on the
// page is the renderer's (article-renderer.tsx), not the editor's.

export interface ArticleNodeOptions {
  /** An image's address from its stored path, for the editor's preview. */
  imageUrl: (src: string) => string;
  /**
   * The services the booking button may book: a function, so the list stays
   * current (configure() copies arrays).
   */
  services: () => readonly { slug: string; name: string }[];
}

const WIDTH_LABELS: Record<ArticleImageWidth, string> = {
  text: "W tekście",
  wide: "Szeroko",
  full: "Na całą szerokość",
};

const FIELD =
  "w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] aria-[invalid=true]:border-[var(--danger)]";

/** A block's frame in the editor: its name, its form, a way to remove it. */
function BlockFrame({
  name,
  onRemove,
  children,
}: {
  name: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="my-4 grid gap-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <div
        className="flex items-center justify-between gap-2"
        contentEditable={false}
      >
        <span className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
          {name}
        </span>
        <button
          aria-label={`Usuń: ${name}`}
          className="inline-flex size-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--danger)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
          onClick={onRemove}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  maxLength,
  required = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  required?: boolean;
  hint?: string;
}) {
  const id = useId();
  const missing = required && value.trim() === "";
  return (
    <div className="grid gap-1" contentEditable={false}>
      <label className="text-xs font-medium text-[var(--text)]" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={missing || hint ? `${id}-note` : undefined}
        aria-invalid={missing || undefined}
        className={FIELD}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      {missing ? (
        <p className="text-xs text-[var(--danger)]" id={`${id}-note`}>
          {hint ?? "Uzupełnij to pole."}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-muted)]" id={`${id}-note`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1" contentEditable={false}>
      <label className="text-xs font-medium text-[var(--text)]" htmlFor={id}>
        {label}
      </label>
      <select
        className={FIELD}
        id={id}
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const ALT_HINT =
  "Opisz, co widać na zdjęciu: bez opisu artykułu nie da się zapisać.";

function Preview({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- the editor's preview, not the page
    <img
      alt={alt}
      className="max-h-60 w-full rounded-md bg-[var(--surface)] object-contain"
      src={src}
    />
  );
}

function ImageView({
  node,
  updateAttributes,
  deleteNode,
  extension,
}: NodeViewProps) {
  const options = extension.options as ArticleNodeOptions;
  const attrs = node.attrs as ArticleImageFile & {
    caption: string | null;
    size: ArticleImageWidth;
  };
  return (
    <NodeViewWrapper data-drag-handle="">
      <BlockFrame name="Zdjęcie" onRemove={deleteNode}>
        <Preview alt={attrs.alt} src={options.imageUrl(attrs.src)} />
        <TextInput
          hint={ALT_HINT}
          label="Opis dla osób niewidomych"
          maxLength={ARTICLE_LIMITS.alt}
          onChange={(alt) => updateAttributes({ alt })}
          required
          value={attrs.alt}
        />
        <TextInput
          label="Podpis (opcjonalnie)"
          maxLength={ARTICLE_LIMITS.caption}
          onChange={(caption) => updateAttributes({ caption: caption || null })}
          value={attrs.caption ?? ""}
        />
        <Choice
          label="Szerokość"
          onChange={(size) => updateAttributes({ size })}
          options={ARTICLE_IMAGE_WIDTHS.map((value) => ({
            value,
            label: WIDTH_LABELS[value],
          }))}
          value={attrs.size}
        />
      </BlockFrame>
    </NodeViewWrapper>
  );
}

function ImagePairView({
  node,
  updateAttributes,
  deleteNode,
  extension,
}: NodeViewProps) {
  const options = extension.options as ArticleNodeOptions;
  const images = node.attrs.images as [ArticleImageFile, ArticleImageFile];
  const setAlt = (index: 0 | 1, alt: string) =>
    updateAttributes({
      images: images.map((image, at) =>
        at === index ? { ...image, alt } : image,
      ),
    });
  return (
    <NodeViewWrapper data-drag-handle="">
      <BlockFrame name="Dwa zdjęcia obok siebie" onRemove={deleteNode}>
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <div className="grid content-start gap-2" key={index}>
              <Preview alt={image.alt} src={options.imageUrl(image.src)} />
              <TextInput
                hint={ALT_HINT}
                label={`Opis zdjęcia ${index + 1} dla osób niewidomych`}
                maxLength={ARTICLE_LIMITS.alt}
                onChange={(alt) => setAlt(index as 0 | 1, alt)}
                required
                value={image.alt}
              />
            </div>
          ))}
        </div>
        <TextInput
          label="Wspólny podpis (opcjonalnie)"
          maxLength={ARTICLE_LIMITS.caption}
          onChange={(caption) => updateAttributes({ caption: caption || null })}
          value={(node.attrs.caption as string | null) ?? ""}
        />
      </BlockFrame>
    </NodeViewWrapper>
  );
}

function CalloutView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const kind = node.attrs.kind as CalloutKind;
  return (
    <NodeViewWrapper>
      <BlockFrame name={`Ramka: ${CALLOUT_LABELS[kind]}`} onRemove={deleteNode}>
        <Choice
          label="Rodzaj ramki"
          onChange={(value) => updateAttributes({ kind: value })}
          options={CALLOUT_KINDS.map((value) => ({
            value,
            label: CALLOUT_LABELS[value],
          }))}
          value={kind}
        />
        <NodeViewContent className="rounded-md bg-[var(--surface)] px-3 py-1" />
      </BlockFrame>
    </NodeViewWrapper>
  );
}

function PullQuoteView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper>
      <BlockFrame name="Wyróżniony cytat" onRemove={deleteNode}>
        <NodeViewContent className="rounded-md bg-[var(--surface)] px-3 py-1 text-lg italic" />
        <TextInput
          label="Kto to powiedział (opcjonalnie)"
          maxLength={ARTICLE_LIMITS.quoteAuthor}
          onChange={(author) => updateAttributes({ author: author || null })}
          value={(node.attrs.author as string | null) ?? ""}
        />
      </BlockFrame>
    </NodeViewWrapper>
  );
}

function BookingButtonView({
  node,
  updateAttributes,
  deleteNode,
  extension,
}: NodeViewProps) {
  const options = extension.options as ArticleNodeOptions;
  return (
    <NodeViewWrapper data-drag-handle="">
      <BlockFrame name="Przycisk „Umów wizytę”" onRemove={deleteNode}>
        <TextInput
          hint="Tekst na przycisku."
          label="Tekst przycisku"
          maxLength={ARTICLE_LIMITS.buttonLabel}
          onChange={(label) => updateAttributes({ label })}
          required
          value={node.attrs.label as string}
        />
        <Choice
          label="Usługa"
          onChange={(service) =>
            updateAttributes({ service: service === "" ? null : service })
          }
          options={[
            { value: "", label: "Bez wybranej usługi" },
            ...options.services().map((service) => ({
              value: service.slug,
              label: service.name,
            })),
          ]}
          value={(node.attrs.service as string | null) ?? ""}
        />
      </BlockFrame>
    </NodeViewWrapper>
  );
}

const atomBlock = {
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
} as const;

/** A JSON attribute kept as data-* on copy and paste. */
const jsonAttribute = (name: string, fallback: unknown) => ({
  default: fallback,
  parseHTML: (element: HTMLElement) => {
    try {
      return JSON.parse(element.getAttribute(`data-${name}`) ?? "");
    } catch {
      return fallback;
    }
  },
  renderHTML: (attributes: Record<string, unknown>) => ({
    [`data-${name}`]: JSON.stringify(attributes[name]),
  }),
});

const nodeOptions = (): ArticleNodeOptions => ({
  imageUrl: (src) => src,
  services: () => [],
});

export const ArticleImage = Node.create<ArticleNodeOptions>({
  name: "articleImage",
  ...atomBlock,
  addOptions: nodeOptions,
  addAttributes: () => ({
    src: { default: "" },
    alt: { default: "" },
    width: { default: 1 },
    height: { default: 1 },
    caption: { default: null },
    size: { default: "text" },
  }),
  parseHTML: () => [{ tag: "figure[data-article-image]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "figure",
    mergeAttributes(HTMLAttributes, { "data-article-image": "" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(ImageView),
});

export const ArticleImagePair = Node.create<ArticleNodeOptions>({
  name: "articleImagePair",
  ...atomBlock,
  addOptions: nodeOptions,
  addAttributes: () => ({
    images: jsonAttribute("images", []),
    caption: { default: null },
  }),
  parseHTML: () => [{ tag: "figure[data-article-image-pair]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "figure",
    mergeAttributes(HTMLAttributes, { "data-article-image-pair": "" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(ImagePairView),
});

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "(paragraph | bulletList | orderedList)+",
  defining: true,
  addAttributes: () => ({ kind: { default: "important" } }),
  parseHTML: () => [{ tag: "aside[data-callout]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "aside",
    mergeAttributes(HTMLAttributes, { "data-callout": "" }),
    0,
  ],
  addNodeView: () => ReactNodeViewRenderer(CalloutView),
});

export const PullQuote = Node.create({
  name: "pullQuote",
  group: "block",
  content: "paragraph+",
  defining: true,
  addAttributes: () => ({ author: { default: null } }),
  parseHTML: () => [{ tag: "figure[data-pull-quote]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "figure",
    mergeAttributes(HTMLAttributes, { "data-pull-quote": "" }),
    0,
  ],
  addNodeView: () => ReactNodeViewRenderer(PullQuoteView),
});

export const BookingButton = Node.create<ArticleNodeOptions>({
  name: "bookingButton",
  ...atomBlock,
  addOptions: nodeOptions,
  addAttributes: () => ({
    label: { default: "Umów wizytę" },
    service: { default: null },
  }),
  parseHTML: () => [{ tag: "div[data-booking-button]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-booking-button": "" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(BookingButtonView),
});
