# Rich Text Platform

## Decision

Kolor Sensu uses one canonical rich-text value: `RichTextDocument`, a validated, deliberately constrained subset of Tiptap/ProseMirror JSON. JSON is the source of truth. HTML is derived presentation and must not be persisted as the only content representation.

The implementation is split by responsibility:

- `@repo/contracts/rich-text` owns framework-independent types, Zod validation, serialization, plain-text extraction, empty-state semantics, and safe-link rules.
- `@repo/ui/rich-text-editor` owns the interactive Tiptap client component.
- `@repo/ui/rich-text-renderer` owns the semantic React renderer and `Prose` presentation wrapper.

Neither contract nor UI code depends on Supabase or domain database models.

## Canonical Document

The canonical empty value is:

```json
{ "type": "doc", "content": [{ "type": "paragraph" }] }
```

Domain fields that are optional may remain `null` at the domain boundary, but a mounted editor receives the canonical empty document. Empty strings, `{}`, arbitrary JSON, and multiple competing empty shapes are not valid documents. `isRichTextEmpty()` treats documents containing only empty structural blocks and whitespace as empty.

Use typed JSON throughout React. Use `serializeRichText()` only when a string boundary requires it, and `parseRichText()` when untrusted JSON crosses into the application. Server actions and API handlers must validate again.

## Extension Whitelist

The editor enables the minimal StarterKit surface required for:

- paragraphs
- headings at levels 2 and 3
- bullet and ordered lists with list items
- blockquotes
- horizontal rules
- hard breaks
- bold, italic, underline, strike, and inline code marks
- links
- undo and redo history

`codeBlock` is disabled. The contract and renderer reject tables, images, video, embeds, iframes, mentions, arbitrary HTML, custom nodes, style attributes, and arbitrary content classes. Adding a feature requires updating the contract, editor configuration, renderer, tests, and documentation together.

## Security Model

The Zod schema is strict and recursively whitelists every node, mark, and attribute. It rejects unknown keys, unsupported heading levels, malformed structures, oversized content, and excessive nesting. The renderer validates at its own boundary and explicitly maps accepted values to React elements; it never uses `dangerouslySetInnerHTML`.

Links are checked both when edited and when rendered. Allowed values are `http`, `https`, `mailto`, `tel`, root-relative paths, dot-relative paths, and fragments. Protocol-relative URLs, control characters, whitespace-padded values, backslash paths, malformed URLs, and executable schemes such as `javascript:` are rejected. External HTTP(S) links render with `target="_blank"` and `rel="noopener noreferrer"`.

Current generic safety limits are:

- 100,000 plain-text characters
- 500,000 serialized UTF-8 bytes
- nesting depth of 12
- link length of 2,048 characters

Domains can compose `richTextDocumentWithMaxCharacters()` for a stricter field limit. Domain-specific limits do not belong in the renderer.

## Rendering Boundaries

`RichTextEditor` is a small `"use client"` boundary because Tiptap is interactive. It uses `immediatelyRender: false` for Next.js hydration safety and exposes a controlled `value`/`onChange` API. Parent pages, layouts, and form shells should remain Server Components whenever possible.

`RichTextRenderer` has no `"use client"` directive, browser globals, Tiptap imports, or editor instantiation. It renders deterministic semantic React output during SSR and does not require hydration to display content.

Public read-only code should import the dedicated subpath:

```tsx
import { RichTextRenderer } from "@repo/ui/rich-text-renderer";
```

Admin or Specialist editor fields should import:

```tsx
import { RichTextEditor } from "@repo/ui/rich-text-editor";
```

Keeping these entry points separate prevents editor dependencies from entering a renderer-only import graph. Product forms may dynamically import the editor later if route-level measurements justify it; this foundation does not add a loading flash pre-emptively.

## React Hook Form

The editor remains controlled and works with the existing form-state system:

```tsx
<Controller
  control={control}
  name="description"
  render={({ field }) => (
    <RichTextEditor value={field.value} onChange={field.onChange} />
  )}
/>
```

Do not mirror editor content in Zustand or create a second form-state abstraction. A working `Controller` example is available in Storybook.

## Quality Strategy

- Contract Vitest tests cover accepted and rejected JSON, safe links, empty content, extraction, and limits.
- Renderer Vitest tests cover semantic output and hostile/malformed fallback behavior.
- A Node-environment render-to-string test proves renderer SSR behavior without `window`.
- Editor JSDOM tests cover controlled updates, formatting, headings, lists, links, history, initial content, and disabled behavior.
- Storybook contains editor and renderer states, the responsive toolbar, long content, all formatting, malformed fallback, Editor-to-Renderer parity, and the RHF adapter.
- Storybook a11y provides component-level feedback. Playwright and manual QA remain responsible for complete page and application accessibility.
- Playwright checks the isolated stories at 390, 768, and 1440 pixels, including interaction, link handling, overflow, renderer output, and runtime errors.

## Future Domain Migration

No existing database field changes in this phase. Good candidates for later, explicit migrations are:

- Specialist `long_bio`
- Service `description` when it is genuinely long-form
- Room public profile `long_description`
- selected CMS body fields
- future `BlogArticle.content`

Short labels, names, summaries, and descriptions that do not need formatting should remain plain text. A future Blog model can use `content: RichTextDocument` alongside title, slug, excerpt, cover image, author, publication date, and SEO metadata without changing this foundation. Blog itself is intentionally outside this task.

