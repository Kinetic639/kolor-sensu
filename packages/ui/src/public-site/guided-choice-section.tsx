"use client";

// "Nie wiesz od czego zacząć?": three short questions, asked one at a time
// (progressive disclosure), and a suggestion: a form of support and one or
// two specialists. The picture beside the questions follows the first
// answer and is painted in again (WatercolorImage's own reveal) when it
// changes. Native radio groups, so it works with a keyboard and a screen
// reader as any form does; the suggestion is announced politely.
//
// Server HTML: the first question and the picture. The next question only
// appears once the previous one is answered, sliding in (GSAP, a few px).

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ArrowRight, RotateCcw } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useId, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { PrimaryButton } from "./actions";
import {
  type GuidedAnswers,
  type GuidedAudience,
  type GuidedConcern,
  type GuidedFormat,
  type GuidedSpecialist,
  matchSupport,
} from "./guided-choice-match";
import { PageLink as Link } from "./page-link";
import { matches } from "./reveal-support";
import { EditorialHeading, SectionEyebrow } from "./typography";
import { WatercolorImage } from "./watercolor-image";

gsap.registerPlugin(useGSAP);

interface Option<T extends string> {
  value: T;
  label: string;
}

export interface GuidedChoiceSectionProps {
  audiences: readonly (Option<GuidedAudience> & {
    image: { src: string; alt: string; objectPosition?: string };
  })[];
  concerns: readonly Option<GuidedConcern>[];
  formats: readonly Option<GuidedFormat>[];
  specialists: readonly GuidedSpecialist[];
  bookingHref: string;
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  id?: string;
  className?: string;
}

type Partial3 = Partial<GuidedAnswers>;

export function GuidedChoiceSection({
  audiences,
  concerns,
  formats,
  specialists,
  bookingHref,
  eyebrow = "Dopasowanie",
  heading = "Nie wiesz, od czego zacząć?",
  description = "Odpowiedz na trzy krótkie pytania. Podpowiemy, jaka forma wsparcia może być dobrym początkiem i kto może Ci pomóc.",
  id,
  className,
}: GuidedChoiceSectionProps) {
  const [answers, setAnswers] = useState<Partial3>({});
  const ref = useRef<HTMLElement>(null);
  const baseId = useId();

  const audience = audiences.find((a) => a.value === answers.audience);
  const picture = audience?.image ?? audiences[0]!.image;
  const complete =
    answers.audience && answers.concern && answers.format
      ? (answers as GuidedAnswers)
      : null;
  const suggestion = complete ? matchSupport(complete, specialists) : null;

  // Each newly shown question (and the suggestion) slides in a few px.
  useGSAP(
    () => {
      if (matches("(prefers-reduced-motion: reduce)")) return;
      const fresh = ref.current?.querySelectorAll<HTMLElement>(
        "[data-guided-step]:not([data-shown])",
      );
      fresh?.forEach((element) => {
        element.dataset.shown = "";
        if (element.dataset.guidedStep === "0") return;
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.55, ease: "power2.out" },
        );
      });
    },
    { scope: ref, dependencies: [answers] },
  );

  const set = <K extends keyof GuidedAnswers>(
    key: K,
    value: GuidedAnswers[K],
  ) => setAnswers((current) => ({ ...current, [key]: value }));

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={`${baseId}-heading`}
      className={cn(
        "ks-guided max-w-page px-gutter py-section mx-auto grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-20",
        className,
      )}
    >
      <div className="ks-guided__panel grid content-start gap-8">
        <div className="grid gap-4">
          <SectionEyebrow className="text-pink-strong">
            {eyebrow}
          </SectionEyebrow>
          <EditorialHeading id={`${baseId}-heading`}>
            {heading}
          </EditorialHeading>
          <p className="max-w-copy text-body text-text-muted">{description}</p>
        </div>

        <Question
          step={0}
          name={`${baseId}-audience`}
          legend="Dla kogo szukasz pomocy?"
          options={audiences}
          value={answers.audience}
          onChange={(value) => set("audience", value)}
        />
        {answers.audience ? (
          <Question
            step={1}
            name={`${baseId}-concern`}
            legend="Czego to dotyczy?"
            options={concerns}
            value={answers.concern}
            onChange={(value) => set("concern", value)}
          />
        ) : null}
        {answers.concern ? (
          <Question
            step={2}
            name={`${baseId}-format`}
            legend="Jak chcesz się spotykać?"
            options={formats}
            value={answers.format}
            onChange={(value) => set("format", value)}
          />
        ) : null}

        <div aria-live="polite">
          {suggestion ? (
            <div data-guided-step="3" className="ks-guided__result grid gap-5">
              <div className="grid gap-2">
                <p className="text-eyebrow text-primary-strong uppercase">
                  Proponujemy na początek
                </p>
                <p className="font-display text-h3 text-ink">
                  {suggestion.service}
                </p>
                <p className="text-body text-text-muted max-w-copy">
                  {suggestion.reason}
                </p>
              </div>
              {suggestion.specialists.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {suggestion.specialists.map((specialist) => (
                    <li key={specialist.href}>
                      <SpecialistMatch specialist={specialist} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small text-text-muted">
                  Tę formę prowadzimy tylko w gabinecie. Napisz do nas, a
                  poszukamy rozwiązania.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <PrimaryButton asChild arrow>
                  <Link href={bookingHref}>Umów konsultację</Link>
                </PrimaryButton>
                <button
                  type="button"
                  className="ks-underline text-small text-ink group/reset inline-flex items-center gap-1.5 font-semibold"
                  onClick={() => setAnswers({})}
                >
                  <RotateCcw
                    aria-hidden="true"
                    className="ease-soft size-3.5 transition-transform duration-300 group-hover/reset:-rotate-45"
                    strokeWidth={1.75}
                  />
                  Zacznij od nowa
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="lg:sticky lg:top-32 lg:pt-10">
        <WatercolorImage
          key={picture.src}
          src={picture.src}
          alt={picture.alt}
          objectPosition={picture.objectPosition}
          animationPreset="watercolor-reveal"
          sizes="(min-width: 1024px) 45vw, 117vw"
        />
      </div>
    </section>
  );
}

function Question<T extends string>({
  step,
  name,
  legend,
  options,
  value,
  onChange,
}: {
  step: number;
  name: string;
  legend: string;
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset data-guided-step={step} className="grid gap-3">
      <legend className="font-body text-title text-ink mb-3">
        <span className="text-pink-strong mr-2 tabular-nums">{step + 1}/3</span>
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="ks-choice">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="ks-choice__label">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SpecialistMatch({ specialist }: { specialist: GuidedSpecialist }) {
  return (
    <Link
      href={specialist.href}
      className="ks-lift group/match bg-surface/85 shadow-card rounded-card-lg focus-visible:outline-ring flex items-center gap-3 p-3 pr-4 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="relative size-14 shrink-0 overflow-hidden rounded-full">
        <Image
          src={specialist.portraitSrc}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
        />
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="text-title text-ink font-semibold">
          {specialist.name}
        </span>
        <span className="text-small text-text-muted">
          {specialist.role}
          {specialist.online ? " · także online" : ""}
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="ease-soft text-primary size-4 shrink-0 transition-transform duration-200 group-hover/match:translate-x-1"
        strokeWidth={1.75}
      />
    </Link>
  );
}
