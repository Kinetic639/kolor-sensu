"use client";

import { useSave } from "@/lib/use-save";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CenterPublicProfile } from "@repo/contracts";
import {
  companyDetailsSchema,
  companyLine,
  formatTaxId,
  type CompanyDetails,
  type CompanyDetailsInput,
} from "@repo/contracts/company";
import { DetailSection } from "@repo/ui/detail-page";
import { Controller, useForm } from "react-hook-form";
import { updateCenterProfileAction, updateCompanyAction } from "./actions";
import { Field, SaveRow, SwitchRow, withValue } from "./fields";
import {
  centerProfileFormSchema,
  toCenterProfileFormValues,
  type CenterProfileFormValues,
} from "./forms";

// Ustawienia → Centrum: how the site names and describes the centre and
// how to reach it (the header, the footer, Kontakt), and beside it the
// company as the law wants it on the site (its footer).

function ProfileSection({ profile }: { profile: CenterPublicProfile | null }) {
  const { isPending, run } = useSave();
  const defaults = toCenterProfileFormValues(profile);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CenterProfileFormValues>({
    resolver: zodResolver(centerProfileFormSchema),
    defaultValues: defaults,
  });
  const field = withValue(register, defaults);

  return (
    <DetailSection
      note="nagłówek, stopka i strona Kontakt"
      title="Profil na stronie"
    >
      <form
        noValidate
        onSubmit={handleSubmit((values) =>
          run(
            () => updateCenterProfileAction(values),
            "Zapisano profil centrum",
            () => reset(values),
          ),
        )}
      >
        <Controller
          control={control}
          name="published"
          render={({ field }) => (
            <SwitchRow
              checked={field.value}
              description="Wyłączony: strona pokazuje swoje domyślne teksty zamiast opisu i danych kontaktowych poniżej."
              label="Profil opublikowany"
              onCheckedChange={field.onChange}
            />
          )}
        />
        <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
          <Field
            className="sm:col-span-2"
            error={errors.displayName?.message}
            id="center-name"
            label="Nazwa centrum"
            registration={field("displayName")}
          />
          <Field
            className="sm:col-span-2"
            error={errors.shortDescription?.message}
            hint="W stopce, pod logo."
            id="center-description"
            label="Krótki opis"
            multiline
            registration={field("shortDescription")}
          />
          <Field
            error={errors.publicPhone?.message}
            id="center-phone"
            inputMode="tel"
            label="Telefon"
            placeholder="+48 600 700 800"
            registration={field("publicPhone")}
            type="tel"
          />
          <Field
            error={errors.publicEmail?.message}
            id="center-email"
            inputMode="email"
            label="E-mail"
            placeholder="kontakt@kolorsensu.pl"
            registration={field("publicEmail")}
            type="email"
          />
          <Field
            error={errors.instagramUrl?.message}
            id="center-instagram"
            inputMode="url"
            label="Instagram"
            placeholder="https://instagram.com/…"
            registration={field("instagramUrl")}
            type="url"
          />
          <Field
            error={errors.facebookUrl?.message}
            id="center-facebook"
            inputMode="url"
            label="Facebook"
            placeholder="https://facebook.com/…"
            registration={field("facebookUrl")}
            type="url"
          />
          <Field
            error={errors.websiteUrl?.message}
            id="center-website"
            inputMode="url"
            label="Strona www"
            placeholder="https://"
            registration={field("websiteUrl")}
            type="url"
          />
          <SaveRow dirty={isDirty} pending={isPending} />
        </div>
      </form>
    </DetailSection>
  );
}

const companyValues = (company: CompanyDetails): CompanyDetailsInput => ({
  legalName: company.legalName ?? "",
  taxId: company.taxId ? formatTaxId(company.taxId) : "",
  regon: company.regon ?? "",
  registeredAddress: company.registeredAddress ?? "",
});

function CompanySection({ company }: { company: CompanyDetails }) {
  const { isPending, run } = useSave();
  const defaults = companyValues(company);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyDetailsInput, unknown, CompanyDetails>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: defaults,
  });
  const field = withValue(register, defaults);
  const line = companyLine(company);

  return (
    <DetailSection note="w stopce strony" title="Dane firmy">
      <form
        className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2"
        noValidate
        onSubmit={handleSubmit((values) => {
          // As saved: the NIP with its dashes, blanks for what is none.
          const input = companyValues(values);
          run(
            () => updateCompanyAction(input),
            "Zapisano dane firmy",
            () => reset(input),
          );
        })}
      >
        <Field
          className="sm:col-span-2"
          error={errors.legalName?.message}
          hint="Jak w CEIDG lub KRS, np. „Kolor Sensu Anna Nowak”."
          id="company-name"
          label="Nazwa firmy"
          registration={field("legalName")}
        />
        <Field
          error={errors.taxId?.message}
          id="company-nip"
          inputMode="numeric"
          label="NIP"
          placeholder="123-456-32-18"
          registration={field("taxId")}
        />
        <Field
          error={errors.regon?.message}
          id="company-regon"
          inputMode="numeric"
          label="REGON (opcjonalnie)"
          registration={field("regon")}
        />
        <Field
          className="sm:col-span-2"
          error={errors.registeredAddress?.message}
          id="company-address"
          label="Adres siedziby"
          placeholder="ul. Długa 1, 61-001 Poznań"
          registration={field("registeredAddress")}
        />
        <p className="text-[0.75rem] text-[var(--text-muted)] sm:col-span-2">
          {line ? (
            <>
              W stopce: <span className="text-[var(--text)]">{line}</span>
            </>
          ) : (
            "Bez nazwy firmy stopka jej nie pokazuje."
          )}
        </p>
        <SaveRow dirty={isDirty} pending={isPending} />
      </form>
    </DetailSection>
  );
}

export function CentreTab({
  profile,
  company,
}: {
  profile: CenterPublicProfile | null;
  company: CompanyDetails;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--surface)] lg:grid lg:grid-cols-2 lg:overflow-hidden">
      <div className="min-w-0 border-[var(--border)] lg:overflow-y-auto lg:border-r">
        <ProfileSection profile={profile} />
      </div>
      <div className="min-w-0 lg:overflow-y-auto">
        <CompanySection company={company} />
      </div>
    </div>
  );
}
