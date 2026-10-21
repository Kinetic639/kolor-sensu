"use client";

import {
  articleDocumentSchema,
  articleImages,
  emptyArticleDocument,
  type ArticleDocument,
} from "@repo/contracts/article-rich-text";
import { isSafeRichTextHref } from "@repo/contracts/rich-text";
import DragHandle from "@tiptap/extension-drag-handle-react";
import FileHandler from "@tiptap/extension-file-handler";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { SuggestionProps } from "@tiptap/suggestion";
import {
  ArrowDown,
  ArrowUp,
  Columns2,
  GripVertical,
  Plus,
  Rows2,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  articleBlockCommands,
  articleJson,
  moveBlock,
  type ArticleBlockCommand,
} from "./article-editor/commands";
import {
  ArticleImage,
  ArticleImagePair,
  BookingButton,
  Callout,
  PullQuote,
} from "./article-editor/nodes";
import { SlashMenu, type SlashMenuHandlers } from "./article-editor/slash-menu";
import { cn } from "./lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  EDITOR_CONTENT_CLASS,
  RichTextToolbar,
  ToolbarButton,
  ToolbarSeparator,
} from "./rich-text-editor";
import { TooltipProvider } from "./tooltip";

// The article editor (docs/architecture/rich-text-platform.md, article
// profile): the base editor's formatting, plus an article's blocks
// (images, two images, boxes, a quotation with who said it, tables, the
// booking button), inserted from "Wstaw" or by typing "/"; blocks dragged
// by their handle, or moved up and down with buttons (the single-click and
// keyboard way, WCAG 2.5.7); images pasted or dropped in, uploaded by the
// host. It reports every change, also an image still without its text:
// the host's form refuses to save until the article is valid
// (articleDocumentSchema).

export interface UploadedImage {
  /** Its path in site-media (articles/… or ebooks/…). */
  src: string;
  width: number;
  height: number;
}

export interface ArticleEditorProps {
  value: ArticleDocument;
  onChange: (document: ArticleDocument) => void;
  /** Uploads one image file; resolves to where it is and how big. */
  uploadImage: (file: File) => Promise<UploadedImage>;
  /** An image's address from its path, for the editor's preview. */
  imageUrl: (src: string) => string;
  /** The services the booking button may book. */
  services?: readonly { slug: string; name: string }[];
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Menu = SuggestionProps<ArticleBlockCommand, ArticleBlockCommand>;

export function ArticleEditor({
  value,
  onChange,
  uploadImage,
  imageUrl,
  services = [],
  ariaLabel = "Treść artykułu",
  placeholder = "Pisz albo wpisz „/”, aby wstawić zdjęcie, ramkę, tabelę…",
  disabled = false,
}: ArticleEditorProps) {
  const upload = useRef(uploadImage);
  upload.current = uploadImage;
  const host = useRef({ imageUrl, services });
  host.current = { imageUrl, services };
  const nodeOptions = {
    imageUrl: (src: string) => host.current.imageUrl(src),
    services: () => host.current.services,
  };
  const [status, setStatus] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const picking = useRef<1 | 2>(1);
  const editorRef = useRef<Editor | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [active, setActive] = useState(0);
  const handlers = useRef<SlashMenuHandlers | null>(null);

  const commands = useMemo(
    () =>
      articleBlockCommands({
        pick: (count) => {
          picking.current = count;
          if (fileInput.current) {
            fileInput.current.multiple = count === 2;
            fileInput.current.click();
          }
        },
      }),
    [],
  );

  /** Uploads images and inserts them: one each, or two side by side. */
  async function insertImages(files: File[], pair: boolean, at?: number) {
    const editor = editorRef.current;
    const usable = files.filter((file) => IMAGE_TYPES.includes(file.type));
    if (!editor || usable.length === 0) {
      setStatus({ text: "Wybierz zdjęcie JPG, PNG albo WebP.", error: true });
      return;
    }
    if (pair && usable.length !== 2) {
      setStatus({ text: "Wybierz dokładnie dwa zdjęcia.", error: true });
      return;
    }
    setStatus({ text: "Wgrywanie zdjęcia…" });
    try {
      const uploaded = [];
      for (const file of usable) uploaded.push(await upload.current(file));
      const nodes = pair
        ? [
            {
              type: "articleImagePair",
              attrs: {
                images: uploaded.map((image) => ({ ...image, alt: "" })),
                caption: null,
              },
            },
          ]
        : uploaded.map((image) => ({
            type: "articleImage",
            attrs: { ...image, alt: "", caption: null, size: "text" },
          }));
      const chain = editor.chain().focus();
      (at === undefined
        ? chain.insertContent(nodes)
        : chain.insertContentAt(at, nodes)
      ).run();
      setStatus({
        text: "Zdjęcie wstawione. Opisz je dla osób niewidomych.",
      });
    } catch (error) {
      setStatus({
        text:
          error instanceof Error && error.message
            ? `Nie udało się wgrać zdjęcia: ${error.message}`
            : "Nie udało się wgrać zdjęcia.",
        error: true,
      });
    }
  }
  const insert = useRef(insertImages);
  insert.current = insertImages;

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [2, 3] },
        link: {
          autolink: false,
          linkOnPaste: false,
          openOnClick: false,
          protocols: ["http", "https", "mailto", "tel"],
          isAllowedUri: (url) => isSafeRichTextHref(url),
        },
      }),
      Placeholder.configure({ placeholder }),
      TableKit.configure({ table: { resizable: false } }),
      ArticleImage.configure(nodeOptions),
      ArticleImagePair.configure(nodeOptions),
      Callout,
      PullQuote,
      BookingButton.configure(nodeOptions),
      FileHandler.configure({
        allowedMimeTypes: IMAGE_TYPES,
        onPaste: (_editor, files) => void insert.current(files, false),
        onDrop: (_editor, files, pos) => void insert.current(files, false, pos),
      }),
      SlashMenu.configure({ commands, handlers: () => handlers.current }),
    ],
    // The editor is built once; its host's callbacks are read through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editor = useEditor({
    extensions,
    content: value ?? emptyArticleDocument,
    editable: !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": ariaLabel,
        "aria-multiline": "true",
        "aria-disabled": String(disabled),
        class:
          "min-h-80 px-4 py-3 pl-10 outline-none [&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-[var(--text-muted)] [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
      },
    },
    onUpdate: ({ editor: updated }) => {
      if (!disabled) onChange(articleJson(updated));
    },
  });
  editorRef.current = editor;

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  // A value from outside (another draft loaded): shown, unless it is what
  // the editor already holds.
  useEffect(() => {
    if (!editor) return;
    if (JSON.stringify(articleJson(editor)) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  handlers.current = {
    show: (props) => {
      setMenu(props);
      setActive((current) =>
        Math.min(current, Math.max(props.items.length - 1, 0)),
      );
    },
    hide: () => {
      setMenu(null);
      setActive(0);
    },
    keyDown: (event) => {
      if (!menu) return false;
      if (event.key === "ArrowDown") {
        setActive((current) => (current + 1) % Math.max(menu.items.length, 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        setActive(
          (current) =>
            (current - 1 + menu.items.length) % Math.max(menu.items.length, 1),
        );
        return true;
      }
      if (event.key === "Enter") {
        const chosen = menu.items[active];
        if (chosen) menu.command(chosen);
        return true;
      }
      if (event.key === "Escape") {
        setMenu(null);
        return true;
      }
      return false;
    },
  };

  const missingText = articleImages(value).filter(
    (image) => !image.alt.trim(),
  ).length;
  const valid = articleDocumentSchema.safeParse(value).success;
  const inTable = editor?.isActive("table") ?? false;
  const rect = menu?.clientRect?.();

  return (
    <div
      className="relative rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary-soft)]"
      data-disabled={disabled || undefined}
    >
      <TooltipProvider delayDuration={300}>
        <RichTextToolbar disabled={disabled} editor={editor}>
          <ToolbarSeparator />
          <InsertMenu
            commands={commands}
            disabled={disabled || !editor}
            editor={editor}
          />
          <ToolbarButton
            disabled={disabled || !editor}
            icon={<ArrowUp />}
            label="Przesuń blok w górę"
            onClick={() => editor && moveBlock(editor, -1)}
          />
          <ToolbarButton
            disabled={disabled || !editor}
            icon={<ArrowDown />}
            label="Przesuń blok w dół"
            onClick={() => editor && moveBlock(editor, 1)}
          />
          {inTable ? (
            <>
              <ToolbarSeparator />
              <ToolbarButton
                icon={<Rows2 />}
                label="Dodaj wiersz pod spodem"
                onClick={() => editor?.chain().focus().addRowAfter().run()}
              />
              <ToolbarButton
                icon={<Columns2 />}
                label="Dodaj kolumnę po prawej"
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
              />
              <ToolbarButton
                label="Usuń wiersz"
                onClick={() => editor?.chain().focus().deleteRow().run()}
                text="−W"
              />
              <ToolbarButton
                label="Usuń kolumnę"
                onClick={() => editor?.chain().focus().deleteColumn().run()}
                text="−K"
              />
              <ToolbarButton
                icon={<Trash2 />}
                label="Usuń tabelę"
                onClick={() => editor?.chain().focus().deleteTable().run()}
              />
            </>
          ) : null}
        </RichTextToolbar>
      </TooltipProvider>

      {editor && !disabled ? (
        <DragHandle editor={editor}>
          <div
            aria-hidden="true"
            className="flex size-6 cursor-grab items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            title="Przeciągnij, aby przenieść blok"
          >
            <GripVertical className="size-4" />
          </div>
        </DragHandle>
      ) : null}

      <div
        className={cn(
          EDITOR_CONTENT_CLASS,
          "[&_.ProseMirror_table]:my-4 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-[var(--border)] [&_.ProseMirror_td]:px-2 [&_.ProseMirror_td]:py-1 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-[var(--border)] [&_.ProseMirror_th]:bg-[var(--surface-muted)] [&_.ProseMirror_th]:px-2 [&_.ProseMirror_th]:py-1 [&_.ProseMirror_th]:text-left [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-[var(--primary)]",
        )}
      >
        <EditorContent editor={editor} />
      </div>

      {menu && rect && menu.items.length > 0 ? (
        <ul
          aria-label="Wstaw blok"
          className="fixed z-50 grid max-h-72 w-64 overflow-y-auto rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
          role="listbox"
          style={{ top: rect.bottom + 4, left: rect.left }}
        >
          {menu.items.map((item, index) => (
            <li
              aria-selected={index === active}
              className={cn(
                "cursor-pointer rounded px-2.5 py-1.5 text-sm text-[var(--text)]",
                index === active && "bg-[var(--surface-muted)]",
              )}
              key={item.id}
              onMouseDown={(event) => {
                event.preventDefault();
                menu.command(item);
              }}
              role="option"
            >
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}

      <input
        accept={IMAGE_TYPES.join(",")}
        aria-hidden="true"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void insertImages(files, picking.current === 2);
        }}
        ref={fileInput}
        tabIndex={-1}
        type="file"
      />

      <div
        aria-live="polite"
        className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] px-4 py-2 text-xs"
      >
        {status ? (
          <span
            className={
              status.error ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
            }
            role={status.error ? "alert" : undefined}
          >
            {status.text}
          </span>
        ) : null}
        {missingText > 0 ? (
          <span className="text-[var(--danger)]">
            {missingText === 1
              ? "1 zdjęcie bez opisu dla osób niewidomych."
              : `Zdjęcia bez opisu dla osób niewidomych: ${missingText}.`}
          </span>
        ) : !valid ? (
          <span className="text-[var(--danger)]">
            Uzupełnij zaznaczone pola w blokach.
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** "Wstaw": every block, as the "/" menu has them, for the pointer. */
function InsertMenu({
  editor,
  commands,
  disabled,
}: {
  editor: Editor | null;
  commands: readonly ArticleBlockCommand[];
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:opacity-50"
          disabled={disabled}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Wstaw
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <ul aria-label="Wstaw blok" className="grid">
          {commands.map((command) => (
            <li key={command.id}>
              <button
                className="w-full rounded px-2.5 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
                onClick={() => {
                  setOpen(false);
                  if (editor) command.run(editor);
                }}
                type="button"
              >
                {command.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
