import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { JsonLd } from "./json-ld";
import { EditorialHeading, SectionEyebrow } from "./typography";

// Server-safe section around a client accordion (shadcn Accordion,
// restyled). Every answer is in the server HTML (forceMount: closed answers
// are only hidden), and the questions are also published as schema.org
// FAQPage, so they can appear in search results.

export interface FaqItem {
  question: string;
  /** Plain text: it is also the structured-data answer. */
  answer: string;
}

export interface FaqSectionProps {
  items: readonly FaqItem[];
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  cta?: { href: string; label: ReactNode };
  id?: string;
  className?: string;
}

export function FaqSection({
  items,
  eyebrow = "Pytania i odpowiedzi",
  heading = "Zanim się zobaczymy",
  description,
  cta,
  id,
  className,
}: FaqSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "max-w-page px-gutter py-section-sm mx-auto grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16",
        className,
      )}
    >
      <div className="grid content-start gap-4">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <EditorialHeading>{heading}</EditorialHeading>
        {description ? (
          <p className="max-w-copy text-body text-text-muted">{description}</p>
        ) : null}
        {cta ? (
          <ArrowLink href={cta.href} className="mt-2 justify-self-start">
            {cta.label}
          </ArrowLink>
        ) : null}
      </div>
      <Accordion
        type="single"
        collapsible
        className="border-border/70 border-t"
      >
        {items.map((item, index) => (
          <AccordionItem
            key={item.question}
            value={`faq-${index}`}
            className="border-border/70"
          >
            <AccordionTrigger className="font-display text-ink focus-visible:ring-ring [&>svg]:text-primary rounded-none py-5 text-[1.1875rem] leading-snug font-semibold hover:no-underline [&>svg]:size-5">
              {item.question}
            </AccordionTrigger>
            <AccordionContent
              forceMount
              className="text-body text-text-muted max-w-copy pb-6"
            >
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />
    </section>
  );
}
