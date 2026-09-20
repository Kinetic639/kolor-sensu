import { createPublicClient } from "@/lib/supabase/public";
import { getPublishedHomeContent } from "@repo/supabase";
import { Container } from "@repo/ui/container";
import { TestContentBlock } from "@repo/ui/test-content-block";
import type { Metadata } from "next";
import { cache } from "react";

const loadHomeContent = cache(() =>
  getPublishedHomeContent(createPublicClient()),
);

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadHomeContent();

  if (!content) {
    return {
      title: "Kolor Sensu | Centrum Psychoterapii",
      description: "Kolor Sensu, Centrum Psychoterapii.",
    };
  }

  return {
    title: content.heading,
    description: content.body.slice(0, 160),
  };
}

export default async function Home() {
  const content = await loadHomeContent();

  if (!content) {
    return (
      <div className="flex min-h-[60vh] items-center py-16">
        <Container>
          <p className="text-sm text-[var(--ks-color-text-muted)]">
            KOLOR SENSU · Centrum Psychoterapii
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            Strona w przygotowaniu
          </h1>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-10">
      <Container>
        <TestContentBlock
          body={content.body}
          buttonLabel={content.buttonLabel}
          heading={content.heading}
        />
      </Container>
    </div>
  );
}
