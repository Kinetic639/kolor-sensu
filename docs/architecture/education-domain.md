# Education domain (Edukacja: articles and e-books)

Migration `20261021120000_education.sql`; tests `supabase/tests/education.sql`;
contracts `packages/contracts/src/education.ts` (and `article-rich-text.ts`
for an article's body); data access `packages/supabase/src/education.ts`
(`@repo/supabase/education`). Plan and progress:
[docs/product/education-plan.md](../product/education-plan.md).

## Model

- **`article_categories`**: slug, name, description, order. Plain rows that
  admins write directly (RLS). One in use, by an article's draft or its
  published version, cannot be deleted (`delete_article_category` refuses
  with `category_in_use`).
- **`articles`** and **`ebooks`**: one row each. The **published version**
  lives in typed columns, which the site reads, lists and filters by. The
  **working version** lives in `draft` (jsonb; its outline is checked by
  `private.article_draft_is_valid` / `private.ebook_draft_is_valid`, its
  full shape by the contracts on save).
  - Editing changes the draft only, so a published article stays as it was
    until published again (`has_unpublished_changes` in the admin list).
  - `publish_article` / `publish_ebook` refuse an incomplete draft
    (`article_incomplete:<field>`; Polish words in `PUBLISH_PROBLEMS`).
    They copy the draft to the columns, link the article's services and
    specialists (`article_services`, `article_specialists`) and keep a
    changed address as a redirect (`article_slug_redirects`,
    `ebook_slug_redirects`; the new address stops redirecting).
  - `unpublish_*` hides it.
  - `delete_*` only takes one that is not published.
- **Author**: a specialist (`author_specialist_id`) or the team
  (`author_kind = 'team'`, "Zespół Kolor Sensu"). The reviewer is
  optional. A specialist deleted later leaves the article without the
  link (`ON DELETE SET NULL`).

## Access

- Visitors and signed-in non-admins read published rows only (RLS), and
  never the `draft` column (column grants exclude it). Links and
  redirects are readable only for published articles and e-books.
- Admins read every row through RLS. They read and write drafts, publish
  and withdraw only through the `SECURITY DEFINER` functions, which check
  the admin role (`private.require_admin`). The tables take no direct
  writes.

## Files

- Images (covers, sharing pictures, images in an article's body) go to
  the public `site-media` bucket, folders `articles/` and `ebooks/`
  (`uploadEducationImage`, at most 5 MB, JPG, PNG or WebP). The body keeps
  each image's path and size.
- Free samples go to the public `site-downloads` bucket: PDF only, at
  most 20 MB, uploaded by admins (`uploadEbookSample`), downloaded from
  `ebookSampleUrl`.
