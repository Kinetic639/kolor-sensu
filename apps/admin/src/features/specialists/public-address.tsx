"use client";

import { Button } from "@repo/ui/button";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { toast } from "@repo/ui/toast";
import { useState, useTransition, type FormEvent } from "react";
import { setSpecialistSlugAction } from "./actions";
import { publicSlugFormSchema, suggestPublicSlug } from "./slug-form";

// "Zmień" beside the profile's address on the site: a dialog with the
// address, a preview of the whole link and the name as a suggestion. The
// old address keeps working (it redirects).

const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export function PublicAddressButton({
  specialistId,
  displayName,
  slug: current,
}: {
  specialistId: string;
  displayName: string;
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const suggestion = suggestPublicSlug(displayName);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = publicSlugFormSchema.safeParse({ slug });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nieprawidłowy adres.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setSpecialistSlugAction({
        specialistId,
        slug: parsed.data.slug,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      toast.success("Zmieniono adres profilu", {
        description: `/specjalisci/${result.slug}`,
      });
    });
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSlug(current);
          setError(null);
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <button
          aria-label="Zmień adres profilu"
          className={DETAIL_BUTTON}
          type="button"
        >
          Zmień
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adres profilu na stronie</DialogTitle>
          <DialogDescription>
            Stary adres będzie dalej działał i przekieruje na nowy.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="public-slug">Adres (slug)</Label>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="shrink-0 text-sm text-[var(--text-muted)]"
              >
                /specjalisci/
              </span>
              <Input
                aria-describedby="public-slug-preview public-slug-error"
                aria-invalid={error ? true : undefined}
                autoComplete="off"
                id="public-slug"
                onChange={(event) => setSlug(event.target.value)}
                spellCheck={false}
                value={slug}
              />
            </div>
            <p
              className="text-xs break-all text-[var(--text-muted)]"
              id="public-slug-preview"
            >
              {webUrl}/specjalisci/{slug.trim() || "…"}
            </p>
            {error ? (
              <p
                className="text-sm text-[var(--danger)]"
                id="public-slug-error"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
          {suggestion && suggestion !== slug ? (
            <Button
              onClick={() => {
                setSlug(suggestion);
                setError(null);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Użyj imienia i nazwiska: {suggestion}
            </Button>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="secondary"
            >
              Anuluj
            </Button>
            <Button loading={pending} type="submit">
              Zapisz adres
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
