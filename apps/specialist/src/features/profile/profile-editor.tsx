"use client";

import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CLIENT_GROUP_LABELS,
  clientGroupLabels,
  clientGroupSchema,
  personName,
  specialistProfileDraftInputSchema,
  specialistProfileSubmissionSchema,
} from "@repo/contracts";
import {
  SPECIALIST_IMAGE_TYPES,
  uploadSpecialistProfileImage,
  validateSpecialistImage,
} from "@repo/supabase";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Checkbox } from "@repo/ui/checkbox";
import { ImageCropDialog } from "@repo/ui/image-crop-dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { PageHeader, SectionHeader } from "@repo/ui/portal-content";
import { RichTextEditor } from "@repo/ui/rich-text-editor";
import {
  ProfilePhotoField,
  ProfileStatusBanner,
  SpecialistProfilePreview,
  TagListField,
} from "@repo/ui/specialist-profile";
import { Textarea } from "@repo/ui/textarea";
import { ExternalLink, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, type Path, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { saveProfileDraftAction, submitProfileAction } from "./actions";
import type { ProfileEditorViewModel, ProfileFormValues } from "./types";

type PhotoKind = "profile" | "portrait";
const photoField = {
  profile: "profilePhotoUrl",
  portrait: "portraitPhotoUrl",
} as const;

const modalityOptions = [
  "Spotkania stacjonarne",
  "Spotkania online",
  "Konsultacje wideo",
] as const;

const SHORT_BIO_MAX = 500;
// The original may be large; only the cropped JPEG (well under 5 MB) is stored.
const SOURCE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(value));
}

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-[var(--danger)]">
      {" "}
      *
    </span>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-sm text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

export function ProfileEditor({ model }: { model: ProfileEditorViewModel }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [previews, setPreviews] = useState(model.photoPreviews);
  const [uploading, setUploading] = useState<PhotoKind | null>(null);
  const [photoErrors, setPhotoErrors] = useState<
    Partial<Record<PhotoKind, string>>
  >({});
  const [crop, setCrop] = useState<{ kind: PhotoKind; url: string } | null>(
    null,
  );
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    clearErrors,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    // The rich text schema reads `unknown` input (it validates stored JSON);
    // the form always holds a document, so the resolver is typed as such.
    resolver: zodResolver(
      specialistProfileDraftInputSchema,
    ) as unknown as Resolver<ProfileFormValues>,
    defaultValues: model.values,
  });
  const values = watch();
  const fullName = personName(values);
  const locked = !model.editable;
  const busy = isPending || uploading !== null;

  // Object URLs of chosen or cropped photos, freed when replaced or unmounted.
  const objectUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function showPhoto(kind: PhotoKind, url: string | null) {
    setPreviews((current) => {
      const previous = current[photoField[kind]];
      if (previous && objectUrls.current.has(previous) && previous !== url) {
        URL.revokeObjectURL(previous);
        objectUrls.current.delete(previous);
      }
      return { ...current, [photoField[kind]]: url };
    });
  }

  function objectUrlFor(blob: Blob) {
    const url = URL.createObjectURL(blob);
    objectUrls.current.add(url);
    return url;
  }

  function setPhotoError(kind: PhotoKind, message?: string) {
    setPhotoErrors((current) => ({ ...current, [kind]: message }));
  }

  // A chosen file is cropped first; only the crop is uploaded.
  function onPhotoSelect(kind: PhotoKind, file: File) {
    if (!(SPECIALIST_IMAGE_TYPES as string[]).includes(file.type)) {
      setPhotoError(kind, "Wybierz plik JPG, PNG lub WebP.");
      return;
    }
    if (file.size > SOURCE_IMAGE_MAX_BYTES) {
      setPhotoError(kind, "Plik jest za duży. Maksymalny rozmiar to 20 MB.");
      return;
    }
    setPhotoError(kind);
    setCrop({ kind, url: objectUrlFor(file) });
  }

  function onPhotoAdjust(kind: PhotoKind) {
    const url = previews[photoField[kind]];
    if (url) setCrop({ kind, url });
  }

  function closeCrop() {
    setCrop((current) => {
      // A chosen file that was never saved is dropped with its URL.
      if (
        current &&
        objectUrls.current.has(current.url) &&
        current.url !== previews[photoField[current.kind]]
      ) {
        URL.revokeObjectURL(current.url);
        objectUrls.current.delete(current.url);
      }
      return null;
    });
  }

  async function onCropConfirm(image: Blob) {
    if (!crop) return;
    const { kind } = crop;
    // WebP, or PNG where the browser cannot encode WebP: both keep transparency.
    const extension = image.type === "image/png" ? "png" : "webp";
    const file = new File([image], `${kind}.${extension}`, {
      type: image.type,
    });
    const problem = validateSpecialistImage(file);
    if (problem) {
      setPhotoError(kind, problem);
      closeCrop();
      return;
    }

    setUploading(kind);
    try {
      const path = await uploadSpecialistProfileImage(createClient(), {
        specialistId: model.specialistId,
        kind,
        file,
      });
      setValue(photoField[kind], path, { shouldDirty: true });
      showPhoto(kind, objectUrlFor(file));
      setPhotoError(kind);
      closeCrop();
    } catch {
      setPhotoError(kind, "Nie udało się wgrać zdjęcia. Spróbuj ponownie.");
    } finally {
      setUploading(null);
    }
  }

  function onPhotoRemove(kind: PhotoKind) {
    setValue(photoField[kind], null, { shouldDirty: true });
    showPhoto(kind, null);
  }

  function run(
    action: typeof saveProfileDraftAction,
    input: ProfileFormValues,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action(input);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      reset(input);
      toast.success(success);
      router.refresh();
    });
  }

  const save = handleSubmit((input) =>
    run(saveProfileDraftAction, input, "Zapisano zmiany w profilu"),
  );

  function submit() {
    clearErrors();
    const result = specialistProfileSubmissionSchema.safeParse(getValues());
    if (!result.success) {
      for (const issue of result.error.issues) {
        setError(issue.path.join(".") as Path<ProfileFormValues>, {
          message: issue.message,
        });
      }
      toast.error("Uzupełnij wymagane pola przed wysłaniem.");
      return;
    }
    run(submitProfileAction, result.data, "Profil wysłany do akceptacji");
  }

  const errorOf = (name: keyof ProfileFormValues) => errors[name]?.message;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mój profil"
        description="Zarządzaj swoim publicznym profilem. Po akceptacji zmiany są widoczne dla klientów na stronie Kolor Sensu."
        meta={
          model.lastModified ? (
            <p className="text-right text-xs text-[var(--text-muted)]">
              Ostatnia modyfikacja
              <span className="block text-sm font-semibold text-[var(--text)]">
                {formatDateTime(model.lastModified)}
              </span>
            </p>
          ) : null
        }
      />

      {model.status ? (
        <ProfileStatusBanner
          reviewComment={model.reviewComment}
          status={model.status}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <form className="min-w-0 space-y-6" noValidate onSubmit={save}>
          <fieldset className="min-w-0 space-y-6" disabled={locked}>
            <Card>
              <SectionHeader
                title="Zdjęcia profilu"
                description="Dodaj zdjęcia, które pomogą klientom Cię poznać."
              />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ProfilePhotoField
                  alt={`Zdjęcie profilowe: ${fullName}`}
                  description="Widoczne na listach specjalistów."
                  error={photoErrors.profile}
                  hint="JPG, PNG lub WebP do 20 MB. Po wybraniu dopasujesz kadr."
                  id="profile-photo"
                  imageUrl={previews.profilePhotoUrl}
                  label="Zdjęcie profilowe"
                  onAdjust={() => onPhotoAdjust("profile")}
                  onRemove={() => onPhotoRemove("profile")}
                  onSelect={(file) => onPhotoSelect("profile", file)}
                  pending={uploading === "profile"}
                />
                <ProfilePhotoField
                  alt={`Portret: ${fullName}`}
                  description="Widoczne na Twojej stronie w serwisie."
                  error={photoErrors.portrait}
                  hint="JPG, PNG lub WebP do 20 MB. Kadr 3:4, dopasujesz go po wybraniu."
                  id="portrait-photo"
                  imageUrl={previews.portraitPhotoUrl}
                  label="Zdjęcie portretowe"
                  onAdjust={() => onPhotoAdjust("portrait")}
                  onRemove={() => onPhotoRemove("portrait")}
                  onSelect={(file) => onPhotoSelect("portrait", file)}
                  pending={uploading === "portrait"}
                  shape="portrait"
                />
              </div>
              <ImageCropDialog
                aspect={crop?.kind === "portrait" ? "portrait" : "square"}
                imageUrl={crop?.url ?? null}
                onConfirm={onCropConfirm}
                onOpenChange={(open) => {
                  if (!open) closeCrop();
                }}
                open={crop !== null}
                pending={uploading !== null}
                title={
                  crop?.kind === "portrait"
                    ? "Dopasuj zdjęcie portretowe"
                    : "Dopasuj zdjęcie profilowe"
                }
              />
            </Card>

            <Card className="space-y-5">
              <SectionHeader
                title="Dane podstawowe"
                description="Pola oznaczone * są wymagane do wysłania profilu."
              />
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="first-name">
                    Imię
                    <RequiredMark />
                  </Label>
                  <Input
                    aria-describedby="first-name-error"
                    aria-invalid={errorOf("firstName") ? true : undefined}
                    autoComplete="given-name"
                    id="first-name"
                    {...register("firstName")}
                  />
                  <FieldError
                    id="first-name-error"
                    message={errorOf("firstName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last-name">
                    Nazwisko
                    <RequiredMark />
                  </Label>
                  <Input
                    aria-describedby="last-name-error"
                    aria-invalid={errorOf("lastName") ? true : undefined}
                    autoComplete="family-name"
                    id="last-name"
                    {...register("lastName")}
                  />
                  <FieldError
                    id="last-name-error"
                    message={errorOf("lastName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="professional-title">
                    Tytuł zawodowy
                    <RequiredMark />
                  </Label>
                  <Input
                    aria-describedby="professional-title-error"
                    aria-invalid={
                      errorOf("professionalTitle") ? true : undefined
                    }
                    id="professional-title"
                    placeholder="np. Psychoterapeutka"
                    {...register("professionalTitle")}
                  />
                  <FieldError
                    id="professional-title-error"
                    message={errorOf("professionalTitle")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="short-bio">
                  Krótki opis
                  <RequiredMark />
                </Label>
                <Textarea
                  aria-describedby="short-bio-count short-bio-error"
                  aria-invalid={errorOf("shortBio") ? true : undefined}
                  id="short-bio"
                  maxLength={SHORT_BIO_MAX}
                  rows={4}
                  {...register("shortBio")}
                />
                <div className="flex justify-between gap-3">
                  <FieldError
                    id="short-bio-error"
                    message={errorOf("shortBio")}
                  />
                  <p
                    className="ml-auto text-xs text-[var(--text-muted)]"
                    id="short-bio-count"
                  >
                    {values.shortBio.length}/{SHORT_BIO_MAX}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Pełny opis
                </p>
                <Controller
                  control={control}
                  name="longBio"
                  render={({ field }) => (
                    <RichTextEditor
                      ariaLabel="Pełny opis"
                      disabled={locked}
                      onChange={field.onChange}
                      placeholder="Opowiedz o sobie, swoim doświadczeniu i sposobie pracy…"
                      value={field.value}
                    />
                  )}
                />
                <FieldError id="long-bio-error" message={errorOf("longBio")} />
                <p className="text-xs text-[var(--text-muted)]">
                  Widoczny na Twojej stronie w serwisie. Możesz dodać
                  śródtytuły, listy, wyróżnienia i linki.
                </p>
              </div>

              {(
                [
                  ["specializations", "Specjalizacje", true],
                  ["therapyApproaches", "Nurty pracy", true],
                  ["certificates", "Certyfikaty", false],
                  ["languages", "Języki", false],
                ] as const
              ).map(([name, label, required]) => (
                <Controller
                  control={control}
                  key={name}
                  name={name}
                  render={({ field }) => (
                    <TagListField
                      error={errorOf(name)}
                      id={`field-${name}`}
                      label={label}
                      maxItems={name === "languages" ? 20 : 50}
                      onChange={field.onChange}
                      required={required}
                      values={field.value}
                    />
                  )}
                />
              ))}

              <Controller
                control={control}
                name="education"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="education">Wykształcenie</Label>
                    <Textarea
                      aria-describedby="education-hint"
                      defaultValue={field.value.join("\n")}
                      id="education"
                      onBlur={field.onBlur}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean),
                        )
                      }
                      rows={4}
                    />
                    <p
                      className="text-xs text-[var(--text-muted)]"
                      id="education-hint"
                    >
                      Każda pozycja w osobnej linii.
                    </p>
                  </div>
                )}
              />

              <Controller
                control={control}
                name="modalities"
                render={({ field }) => (
                  <fieldset
                    aria-describedby={
                      errorOf("modalities") ? "modalities-error" : undefined
                    }
                    className="space-y-2"
                  >
                    <legend className="text-sm font-semibold text-[var(--text)]">
                      Formy spotkań
                      <RequiredMark />
                    </legend>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {modalityOptions.map((option) => {
                        const id = `modality-${option}`;
                        return (
                          <div
                            className="flex min-h-11 items-center gap-2"
                            key={option}
                          >
                            <Checkbox
                              checked={field.value.includes(option)}
                              id={id}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  checked
                                    ? [...field.value, option]
                                    : field.value.filter(
                                        (item) => item !== option,
                                      ),
                                )
                              }
                            />
                            <Label className="font-normal" htmlFor={id}>
                              {option}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                    <FieldError
                      id="modalities-error"
                      message={errorOf("modalities")}
                    />
                  </fieldset>
                )}
              />

              <Controller
                control={control}
                name="clientGroups"
                render={({ field }) => (
                  <fieldset
                    aria-describedby={
                      errorOf("clientGroups")
                        ? "client-groups-error"
                        : undefined
                    }
                    className="space-y-2"
                  >
                    <legend className="text-sm font-semibold text-[var(--text)]">
                      Z kim pracujesz
                      <RequiredMark />
                    </legend>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {clientGroupSchema.options.map((group) => {
                        const id = `client-group-${group}`;
                        return (
                          <div
                            className="flex min-h-11 items-center gap-2"
                            key={group}
                          >
                            <Checkbox
                              checked={field.value.includes(group)}
                              id={id}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  checked
                                    ? [...field.value, group]
                                    : field.value.filter(
                                        (item) => item !== group,
                                      ),
                                )
                              }
                            />
                            <Label className="font-normal" htmlFor={id}>
                              {CLIENT_GROUP_LABELS[group]}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                    <FieldError
                      id="client-groups-error"
                      message={errorOf("clientGroups")}
                    />
                  </fieldset>
                )}
              />
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button disabled={busy} type="submit" variant="secondary">
                Zapisz zmiany
              </Button>
              <Button
                disabled={uploading !== null}
                loading={isPending}
                onClick={submit}
              >
                <Send className="size-4" aria-hidden="true" />
                Wyślij do akceptacji
              </Button>
            </div>
          </fieldset>
        </form>

        <aside
          aria-labelledby="preview-heading"
          className="space-y-3 xl:sticky xl:top-24 xl:self-start"
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              className="font-heading text-xl font-semibold text-[var(--text)]"
              id="preview-heading"
            >
              Podgląd profilu publicznego
            </h2>
            {model.publicUrl ? (
              <a
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] hover:underline"
                href={model.publicUrl}
                rel="noreferrer"
                target="_blank"
              >
                Zobacz w serwisie
                <ExternalLink className="size-4" aria-hidden="true" />
                <span className="sr-only">(otwiera się w nowej karcie)</span>
              </a>
            ) : null}
          </div>
          <SpecialistProfilePreview
            displayName={fullName}
            modalities={values.modalities}
            photoUrl={previews.profilePhotoUrl}
            professionalTitle={values.professionalTitle || null}
            sections={[
              {
                label: "Z kim pracuję",
                items: clientGroupLabels(values.clientGroups),
              },
              { label: "Specjalizacje", items: values.specializations },
              { label: "Nurty pracy", items: values.therapyApproaches },
              { label: "Wykształcenie", items: values.education },
              { label: "Certyfikaty", items: values.certificates },
              { label: "Języki", items: values.languages },
            ]}
            shortBio={values.shortBio}
          />
          <p className="rounded-[var(--radius-control)] bg-[var(--info-soft)] p-3 text-xs text-[var(--text-muted)]">
            To jest podgląd Twojego profilu. Po akceptacji zmian przez
            administratora zostaną one opublikowane w serwisie.
          </p>
        </aside>
      </div>
    </div>
  );
}
