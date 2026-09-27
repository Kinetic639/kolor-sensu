"use client";

import {
  emptyRichTextDocument,
  isSafeRichTextHref,
  richTextDocumentSchema,
  serializeRichText,
  type RichTextDocument,
} from "@repo/contracts/rich-text";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Separator } from "./separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

export interface RichTextEditorProps {
  value: RichTextDocument;
  onChange: (document: RichTextDocument) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Zacznij pisać…",
  disabled = false,
  ariaLabel = "Edytor tekstu sformatowanego",
}: RichTextEditorProps) {
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
    ],
    [placeholder],
  );

  const editor = useEditor({
    extensions,
    content: richTextDocumentSchema.safeParse(value).success
      ? value
      : emptyRichTextDocument,
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
          "min-h-52 px-4 py-3 outline-none [&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-[var(--text-muted)] [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      if (disabled) return;
      const parsed = richTextDocumentSchema.safeParse(
        canonicalizeEditorJson(updatedEditor.getJSON()),
      );
      if (parsed.success) onChange(parsed.data);
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const incoming = richTextDocumentSchema.safeParse(value);
    if (!incoming.success) return;
    const current = richTextDocumentSchema.safeParse(
      canonicalizeEditorJson(editor.getJSON()),
    );
    if (
      !current.success ||
      serializeRichText(current.data) !== serializeRichText(incoming.data)
    ) {
      editor.commands.setContent(incoming.data, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary-soft)]"
      data-disabled={disabled || undefined}
    >
      <TooltipProvider delayDuration={300}>
        <RichTextToolbar disabled={disabled} editor={editor} />
      </TooltipProvider>
      <div className="[&_.ProseMirror_h2]:font-heading [&_.ProseMirror_h3]:font-heading [&_.ProseMirror]:max-w-none [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-7 [&_.ProseMirror]:text-[var(--text)] [&_.ProseMirror_a]:font-medium [&_.ProseMirror_a]:text-[var(--primary)] [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:my-5 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-[var(--primary)] [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-[var(--surface-muted)] [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_h2]:mt-8 [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:text-3xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:mt-6 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-2xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_hr]:my-7 [&_.ProseMirror_hr]:border-[var(--border)] [&_.ProseMirror_ol]:my-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-7 [&_.ProseMirror_p]:my-3 [&_.ProseMirror_ul]:my-4 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-7">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function RichTextToolbar({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  const inactive = disabled || !editor;
  return (
    <div
      aria-label="Formatowanie tekstu"
      className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] bg-[var(--surface-muted)] p-2"
      role="toolbar"
    >
      <ToolbarButton
        active={editor?.isActive("paragraph")}
        disabled={inactive}
        icon={<Pilcrow />}
        label="Akapit"
        onClick={() => editor?.chain().focus().setParagraph().run()}
      />
      <ToolbarButton
        active={editor?.isActive("heading", { level: 2 })}
        disabled={inactive}
        label="Nagłówek 2"
        text="H2"
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run()
        }
      />
      <ToolbarButton
        active={editor?.isActive("heading", { level: 3 })}
        disabled={inactive}
        label="Nagłówek 3"
        text="H3"
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 3 }).run()
        }
      />
      <ToolbarSeparator />
      <ToolbarButton
        active={editor?.isActive("bold")}
        disabled={inactive}
        icon={<Bold />}
        label="Pogrubienie"
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        active={editor?.isActive("italic")}
        disabled={inactive}
        icon={<Italic />}
        label="Kursywa"
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        active={editor?.isActive("underline")}
        disabled={inactive}
        icon={<Underline />}
        label="Podkreślenie"
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        active={editor?.isActive("strike")}
        disabled={inactive}
        icon={<Strikethrough />}
        label="Przekreślenie"
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        active={editor?.isActive("code")}
        disabled={inactive}
        icon={<Code />}
        label="Kod w tekście"
        onClick={() => editor?.chain().focus().toggleCode().run()}
      />
      <ToolbarSeparator />
      <ToolbarButton
        active={editor?.isActive("bulletList")}
        disabled={inactive}
        icon={<List />}
        label="Lista punktowana"
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        active={editor?.isActive("orderedList")}
        disabled={inactive}
        icon={<ListOrdered />}
        label="Lista numerowana"
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        active={editor?.isActive("blockquote")}
        disabled={inactive}
        icon={<Quote />}
        label="Cytat"
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        disabled={inactive}
        icon={<Minus />}
        label="Linia pozioma"
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
      />
      <LinkControl disabled={inactive} editor={editor} />
      <ToolbarSeparator />
      <ToolbarButton
        disabled={inactive || !editor?.can().undo()}
        icon={<Undo2 />}
        label="Cofnij"
        onClick={() => editor?.chain().focus().undo().run()}
      />
      <ToolbarButton
        disabled={inactive || !editor?.can().redo()}
        icon={<Redo2 />}
        label="Ponów"
        onClick={() => editor?.chain().focus().redo().run()}
      />
      <ToolbarButton
        disabled={inactive}
        icon={<RemoveFormatting />}
        label="Wyczyść formatowanie"
        onClick={() =>
          editor?.chain().focus().unsetAllMarks().clearNodes().run()
        }
      />
    </div>
  );
}

function ToolbarButton({
  active = false,
  disabled,
  icon,
  label,
  text,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  text?: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          aria-pressed={active}
          className="min-h-11 min-w-11"
          disabled={disabled}
          size="icon"
          type="button"
          variant={active ? "secondary" : "ghost"}
          onClick={onClick}
        >
          {icon ? (
            <span className="[&>svg]:size-4">{icon}</span>
          ) : (
            <span className="text-xs font-bold">{text}</span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarSeparator() {
  return (
    <Separator className="mx-1 hidden h-7 sm:block" orientation="vertical" />
  );
}

function LinkControl({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const [error, setError] = useState<string | null>(null);
  const active = Boolean(editor?.isActive("link"));
  const handleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setError(null);
    if (nextOpen) setHref(String(editor?.getAttributes("link").href ?? ""));
  };
  const save = () => {
    if (!editor || !isSafeRichTextHref(href)) {
      setError(
        "Podaj bezpieczny adres http(s), mailto, tel lub ścieżkę względną.",
      );
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              aria-label="Edytuj link"
              aria-pressed={active}
              className="min-h-11 min-w-11"
              disabled={disabled}
              size="icon"
              type="button"
              variant={active ? "secondary" : "ghost"}
            >
              <LinkIcon className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Edytuj link</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        aria-label="Edytor linku"
        className="w-[min(22rem,calc(100vw-2rem))]"
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rich-text-link">Adres linku</Label>
            <Input
              autoFocus
              id="rich-text-link"
              placeholder="https://… lub /oferta"
              value={href}
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  save();
                }
              }}
            />
            {error ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {active ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  editor?.chain().focus().unsetLink().run();
                  setOpen(false);
                }}
              >
                Usuń link
              </Button>
            ) : null}
            <Button type="button" onClick={save}>
              Zapisz link
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function canonicalizeEditorJson(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("type" in value)) return value;
  const node = value as {
    type: string;
    text?: unknown;
    attrs?: Record<string, unknown>;
    marks?: unknown[];
    content?: unknown[];
  };
  if (node.type === "text")
    return {
      type: "text",
      text: node.text,
      ...(node.marks?.length
        ? { marks: node.marks.map(canonicalizeMark) }
        : {}),
    };
  if (node.type === "hardBreak" || node.type === "horizontalRule")
    return { type: node.type };
  if (node.type === "heading")
    return {
      type: "heading",
      attrs: { level: node.attrs?.level },
      ...(node.content?.length
        ? { content: node.content.map(canonicalizeEditorJson) }
        : {}),
    };
  if (
    [
      "doc",
      "paragraph",
      "bulletList",
      "orderedList",
      "listItem",
      "blockquote",
    ].includes(node.type)
  )
    return {
      type: node.type,
      ...(node.content?.length
        ? { content: node.content.map(canonicalizeEditorJson) }
        : {}),
    };
  return value;
}

function canonicalizeMark(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("type" in value)) return value;
  const mark = value as { type: string; attrs?: Record<string, unknown> };
  return mark.type === "link"
    ? { type: "link", attrs: { href: mark.attrs?.href } }
    : { type: mark.type };
}
