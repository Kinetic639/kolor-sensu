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

## On the site

- `apps/web/src/lib/education-data.ts` reads what is published (never
  throwing, like `public-data.ts`): every article at once (few), the
  categories, an article's links and old addresses.
- Pages: `/edukacja` (the newest articles), `/edukacja/artykuly`,
  `/edukacja/artykuly/kategoria/[slug]` (only categories in use) and
  `/edukacja/artykuly/[slug]` (an old address redirects; a draft is not
  found). An author's articles show on their profile, a service's on its
  page; the sitemap lists them with the date the text last changed.
- Preview: the portal's "Podgląd" opens `/podglad?artykul=<id>`, which
  signs a token for `/edukacja/artykuly/podglad/<id>`; in Draft Mode that
  page reads the one draft with the service-role key
  (`getArticleDraftPreview`).
- Edukacja's own words (the tops of `/edukacja` and `/edukacja/artykuly`,
  the line while nothing is published, the word about therapy under every
  article) are the CMS's `education_page`.
- E-books: `/edukacja/ebooki` and `/edukacja/ebooki/[slug]` (an old address
  redirects). "Zobacz cenę i kup na Naffy" opens the product on Naffy; we
  show no price. The free sample downloads as `<slug>-fragment.pdf`. An
  article's recommended e-book shows as a card under it.
- The film (`ConsentVideo`) loads nothing until "Odtwórz film" is clicked:
  YouTube's no-cookie player or Vimeo with `dnt=1`, the cover as poster.
  It belongs to the cookie category "Mapy, filmy i treści zewnętrzne";
  withdrawing consent closes the player.
- Every page has one H1 and a link preview: the cover or the portal's
  sharing picture, else a generated card with the title
  (`opengraph-image.tsx`). Google gets an `Article` or a `Book`.
  `tests/e2e/education-pages.spec.ts` checks the pages on a phone and a
  computer (axe, links, no sideways scroll, the film); the keyboard and
  200 % checks cover the three list pages.
- The price (#150): an e-book's `showPrice` (draft) / `show_price`
  (published) chooses between the price read from Naffy and only "Zobacz
  cenę i kup na Naffy". `@repo/app-runtime/naffy-price` reads the
  product's page on the server (product pages on naffy.io only, kept an
  hour, 5 s at most): the price, a promotion's price and end, the lowest
  price of the 30 days before it. Naffy has no public API, so anything
  unexpected gives no price and the button stays as it was. The portal's
  "Sprawdź cenę" shows what visitors will see.
