"use client";

import { useSave } from "@/lib/use-save";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceCreateSchema } from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { DETAIL_BUTTON, DetailSection } from "@repo/ui/detail-page";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/lib/utils";
import {
  EditorialHeading,
  PrimaryButton,
  SectionEyebrow,
  ServiceFacts,
  ServicePageView,
  serviceDisplayName,
  serviceParagraphs,
  type ServiceTeamRow,
} from "@repo/ui/public-site";
import { ServiceSiteTile, type ServiceRow } from "@repo/ui/services";
import { Textarea } from "@repo/ui/textarea";
import { ExternalLink, Monitor } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { publicFonts } from "../specialists/public-fonts";
import { updateServiceAction } from "./actions";

// Treść na stronie: what the site says of the service (its name, address,
// tile text and description), edited beside the page itself: the preview
// is drawn with the site's own components, fonts and watercolors, and
// follows the form as it is typed.

/** What the tile can hold without the text running long. */
const TILE_TEXT = 80;

const schema = serviceCreateSchema.pick({ name: true, slug: true }).extend({
  shortDescription: z.string().trim().max(500),
  description: z.string().trim().max(10_000),
});
type Values = z.infer<typeof schema>;

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-[0.75rem] text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

export function ServiceContent({
  row,
  description,
  team,
  price,
}: {
  row: ServiceRow;
  description: string | null;
  /** Who the page lists (the active offers). */
  team: ServiceTeamRow[];
  /** `od 200 zł`, as the page says it. */
  price: string | null;
}) {
  const { isPending, run } = useSave();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: row.name,
      slug: row.slug,
      shortDescription: row.shortDescription ?? "",
      description: description ?? "",
    },
  });
  const values = watch();
  const tile = values.shortDescription.trim().length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--surface)] lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:overflow-hidden">
      <div className="min-w-0 border-[var(--border)] lg:overflow-y-auto lg:border-r">
        <DetailSection title="Treść">
          <form
            className="grid gap-3.5 px-3.5 py-3"
            noValidate
            onSubmit={handleSubmit((next) =>
              run(
                () =>
                  updateServiceAction(row.id, {
                    name: next.name,
                    slug: next.slug,
                    shortDescription: next.shortDescription || null,
                    description: next.description || null,
                  }),
                "Zapisano treść usługi",
                () => reset(next),
              ),
            )}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="service-name">Nazwa</Label>
              <Input
                aria-describedby="service-name-error"
                aria-invalid={errors.name ? true : undefined}
                id="service-name"
                {...register("name")}
              />
              <FieldError
                id="service-name-error"
                message={errors.name?.message}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="service-slug">Adres na stronie</Label>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[0.75rem] text-[var(--text-muted)]">
                  /oferta/
                </span>
                <Input
                  aria-describedby="service-slug-hint service-slug-error"
                  aria-invalid={errors.slug ? true : undefined}
                  className="font-mono text-[0.8125rem]"
                  id="service-slug"
                  {...register("slug")}
                />
              </div>
              <p
                className="text-[0.75rem] text-[var(--text-muted)]"
                id="service-slug-hint"
              >
                Zmiana adresu przerwie stare linki do tej usługi.
              </p>
              <FieldError
                id="service-slug-error"
                message={errors.slug?.message}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="service-short">Krótki opis</Label>
              <Textarea
                aria-describedby="service-short-hint"
                id="service-short"
                rows={2}
                {...register("shortDescription")}
              />
              <p
                className="flex justify-between gap-3 text-[0.75rem] text-[var(--text-muted)]"
                id="service-short-hint"
              >
                <span>Tekst kafelka w ofercie i pod nazwą na stronie.</span>
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    tile > TILE_TEXT && "text-[var(--warning-foreground)]",
                  )}
                >
                  {tile} / {TILE_TEXT}
                </span>
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="service-description">Opis</Label>
              <Textarea
                aria-describedby="service-description-hint"
                id="service-description"
                rows={12}
                {...register("description")}
              />
              <p
                className="text-[0.75rem] text-[var(--text-muted)]"
                id="service-description-hint"
              >
                Akapity oddziel pustą linią. Bez opisu strona pokaże krótką
                informację o pierwszym kontakcie.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                className="h-7 px-2.5 text-[0.8125rem]"
                disabled={!isDirty}
                loading={isPending}
                size="sm"
                type="submit"
              >
                Zapisz treść
              </Button>
            </div>
          </form>
        </DetailSection>
        <DetailSection title="Kafelek w ofercie">
          <ServiceSiteTile
            className={publicFonts}
            service={{
              ...row,
              name: values.name || row.name,
              shortDescription: values.shortDescription.trim() || null,
            }}
          />
        </DetailSection>
      </div>
      <section
        aria-label="Podgląd strony usługi"
        className="flex min-w-0 flex-col lg:overflow-y-auto"
      >
        <div className="flex min-h-8 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-3.5 text-[0.75rem] text-[var(--text-muted)]">
          <Monitor aria-hidden="true" className="size-3.5" />
          <span className="truncate font-mono text-[var(--text)]">
            /oferta/{values.slug}
          </span>
          {isDirty ? <span>· niezapisane zmiany</span> : null}
          <a
            className={cn(DETAIL_BUTTON, "ml-auto")}
            href={row.publicUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" />
            Na stronie
          </a>
        </div>
        <div
          className={cn(
            publicFonts,
            "bg-bg text-ink font-body flex-1 overflow-x-clip",
          )}
        >
          <div className="grid gap-5 px-5 pt-8 pb-8 sm:px-8 lg:px-10">
            <SectionEyebrow className="text-pink-strong">Oferta</SectionEyebrow>
            <EditorialHeading as="h2" size="display">
              {serviceDisplayName(values.name || row.name)}
            </EditorialHeading>
            {values.shortDescription.trim() ? (
              <p className="max-w-copy text-lead text-text-muted">
                {values.shortDescription.trim()}
              </p>
            ) : null}
            <ServiceFacts
              duration={`${row.durationMinutes} min`}
              price={price}
            />
          </div>
          <ServicePageView
            action={
              // As on the page; here only to look at.
              <PrimaryButton arrow asChild>
                <span>Umów wizytę</span>
              </PrimaryButton>
            }
            className="px-5 pb-10 sm:px-8 lg:px-10"
            paragraphs={serviceParagraphs(values.description)}
            team={team}
          />
        </div>
      </section>
    </div>
  );
}
