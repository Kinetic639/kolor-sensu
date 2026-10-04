"use client";

import { useSave } from "@/lib/use-save";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CenterSettings } from "@repo/contracts";
import { DetailSection } from "@repo/ui/detail-page";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { updateRetentionAction } from "./actions";
import { SaveRow } from "./fields";
import {
  CLIENT_RETENTIONS,
  INTAKE_RETENTIONS,
  retentionFormSchema,
  toRetentionFormValues,
  type RetentionFormValues,
} from "./forms";

// Ustawienia → Dane osobowe (RODO): how long the centre keeps a client's
// details after their last visit, and the questionnaire's answers after
// the visit. Every night what is past keeping is removed: who the client
// was goes, the visits and payments stay (the accounts need them). A
// client's details are also removed at their request, on their card.

const years = (value: string) =>
  value === "off"
    ? "Nie usuwaj automatycznie"
    : value === "1"
      ? "1 rok po ostatniej wizycie"
      : Number(value) < 5
        ? `${value} lata po ostatniej wizycie`
        : `${value} lat po ostatniej wizycie`;

const months = (value: string) =>
  value === "12"
    ? "1 rok po wizycie"
    : value === "24"
      ? "2 lata po wizycie"
      : `${value} miesięcy po wizycie`;

const count = (value: number, one: string, few: string, many: string) =>
  value === 1
    ? `1 ${one}`
    : value % 10 >= 2 &&
        value % 10 <= 4 &&
        (value % 100 < 12 || value % 100 > 14)
      ? `${value} ${few}`
      : `${value} ${many}`;

export function PrivacyTab({
  settings,
  preview,
}: {
  settings: CenterSettings;
  preview: { clients: number; intakes: number };
}) {
  const { isPending, run } = useSave();
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<RetentionFormValues>({
    resolver: zodResolver(retentionFormSchema),
    defaultValues: toRetentionFormValues(settings),
  });

  const select = (
    name: keyof RetentionFormValues,
    label: string,
    choices: readonly string[],
    words: (value: string) => string,
    note: string,
  ) => (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={`retention-${name}`}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger
              aria-describedby={`retention-${name}-note`}
              id={`retention-${name}`}
            >
              {/* Its words in the server's HTML too. */}
              <SelectValue>{words(field.value)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {choices.map((one) => (
                <SelectItem key={one} value={one}>
                  {words(one)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <p
        className="text-[0.75rem] text-[var(--text-muted)]"
        id={`retention-${name}-note`}
      >
        {note}
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--surface)] lg:grid lg:grid-cols-2 lg:overflow-hidden">
      <div className="min-w-0 border-[var(--border)] lg:overflow-y-auto lg:border-r">
        <DetailSection note="RODO" title="Jak długo przechowujemy dane">
          <form
            className="grid gap-3.5 px-3.5 py-3"
            noValidate
            onSubmit={handleSubmit((values) =>
              run(
                () => updateRetentionAction(values),
                "Zapisano okresy przechowywania",
                () => reset(values),
              ),
            )}
          >
            {select(
              "clientRetention",
              "Dane klienta",
              CLIENT_RETENTIONS,
              years,
              "Imię i nazwisko, e-mail, telefon i notatki, na kliencie i jego wizytach. Wizyty i płatności zostają bez nich.",
            )}
            {select(
              "intakeRetention",
              "Odpowiedzi z testu przed konsultacją",
              INTAKE_RETENTIONS,
              months,
              "To dane o zdrowiu: trzymaj je tylko tak długo, jak są potrzebne specjaliście.",
            )}
            <SaveRow dirty={isDirty} pending={isPending} />
          </form>
        </DetailSection>
      </div>
      <div className="min-w-0 lg:overflow-y-auto">
        <DetailSection note="co noc" title="Najbliższe usunięcie">
          <dl className="grid gap-1.5 px-3.5 py-3 text-[0.8125rem]">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Dane klientów</dt>
              <dd className="tabular-nums">
                {count(preview.clients, "klient", "klientów", "klientów")}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Odpowiedzi z testu</dt>
              <dd className="tabular-nums">
                {count(preview.intakes, "test", "testy", "testów")}
              </dd>
            </div>
          </dl>
          <p className="border-t border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-3.5 py-2.5 text-[0.75rem] text-[var(--text-muted)]">
            Według zapisanych ustawień. Klient z wizytą przed sobą albo z
            niezwróconą kwotą czeka, aż sprawa się zamknie.
          </p>
        </DetailSection>
        <DetailSection title="Na żądanie klienta">
          <p className="px-3.5 py-2.5 text-[0.8125rem] text-[var(--text)]">
            Dane klienta usuniesz od razu na jego karcie:{" "}
            <Link
              className="font-medium text-[var(--primary)] underline-offset-4 hover:underline"
              href="/klienci"
            >
              Klienci
            </Link>{" "}
            → klient → „Usuń dane klienta”.
          </p>
        </DetailSection>
      </div>
    </div>
  );
}
