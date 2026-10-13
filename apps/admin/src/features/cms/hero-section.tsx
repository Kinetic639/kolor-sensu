"use client";

import { Field, SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import { zodResolver } from "@hookform/resolvers/zod";
import { homePageContentSchema, type HomePageContent } from "@repo/contracts";
import { DetailSection } from "@repo/ui/detail-page";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { updateHomeDraftAction } from "./actions";
import type { HomeContentViewModel } from "./types";

type Values = z.input<typeof homePageContentSchema>;

/** Home → Hero: the first screen's words; saved as a draft. */
export function HeroSection({ content }: { content: HomeContentViewModel }) {
  const { isPending, run } = useSave();
  const defaults: Values = {
    heading: content.heading,
    body: content.body,
    buttonLabel: content.buttonLabel ?? "",
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values, unknown, HomePageContent>({
    resolver: zodResolver(homePageContentSchema),
    defaultValues: defaults,
  });
  // Its saved value in the server's HTML too (as Ustawienia's withValue).
  const field = (name: keyof Values) => ({
    ...register(name),
    defaultValue: defaults[name] ?? "",
  });

  return (
    <DetailSection note="pierwszy ekran" title="Hero">
      <form
        className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2"
        noValidate
        onSubmit={handleSubmit((values) => {
          const input = { ...values, buttonLabel: values.buttonLabel || null };
          run(
            () => updateHomeDraftAction(input),
            "Zapisano szkic",
            () => reset({ ...input, buttonLabel: input.buttonLabel ?? "" }),
          );
        })}
      >
        <Field
          className="sm:col-span-2"
          error={errors.heading?.message}
          id="cms-hero-heading"
          label="Tytuł"
          registration={field("heading")}
        />
        <Field
          className="sm:col-span-2"
          error={errors.body?.message}
          id="cms-hero-body"
          label="Opis"
          multiline
          registration={field("body")}
        />
        <Field
          error={errors.buttonLabel?.message}
          hint="Puste: przycisk ma swój domyślny tekst."
          id="cms-hero-button"
          label="Tekst przycisku (opcjonalnie)"
          registration={field("buttonLabel")}
        />
        <SaveRow dirty={isDirty} pending={isPending}>
          Zapisz szkic
        </SaveRow>
      </form>
    </DetailSection>
  );
}
