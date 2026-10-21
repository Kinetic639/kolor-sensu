import { EbookWorkspace } from "@/features/education/ebook-workspace";
import { loadEbook, loadEbooks } from "@/features/education/loaders";
import { FullBleed } from "@repo/ui/full-bleed";
import { notFound } from "next/navigation";

// An e-book's page: its draft in one form, saved and published from the
// bar (the workspace).

export default async function EbookPage({ params }: PageProps<"/ebooki/[id]">) {
  const { id } = await params;
  const [ebook, rows] = await Promise.all([loadEbook(id), loadEbooks()]);
  if (!ebook) notFound();
  const row = rows.find((one) => one.id === id);

  return (
    <FullBleed>
      <EbookWorkspace
        hasUnpublishedChanges={row?.hasUnpublishedChanges ?? false}
        id={id}
        initial={ebook.draft}
        key={ebook.updatedAt}
        published={ebook.status === "published"}
        publishedSlug={ebook.slug}
      />
    </FullBleed>
  );
}
