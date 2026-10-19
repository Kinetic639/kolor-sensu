"use client";

import { createClient } from "@/lib/supabase/client";
import { supportAreaImageUrl, uploadSiteImage } from "@repo/supabase";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/lib/utils";
import { toast } from "@repo/ui/toast";
import { ImagePlus } from "lucide-react";
import { useState } from "react";

// One of the site's own photos in a CMS section: a preview, "Dodaj" or
// "Zmień" (uploaded at once into the public site-media bucket, under a new
// name), "Usuń", and the description for screen readers once there is a
// photo. The draft keeps its path; saving the section saves it. A
// decorative image (e.g. the painted photo's backdrop) has no description.

export interface SiteImageValue {
  imagePath: string | null;
  imageUrl: string | null;
  imageAlt: string;
}

export function SiteImageField({
  id,
  folder,
  label,
  hint,
  value,
  onChange,
  decorative = false,
  accept = "image/jpeg,image/png,image/webp",
  removeLabel = "Usuń",
}: {
  id: string;
  folder: "hero" | "story" | "seo" | "appearance" | "about";
  label: string;
  hint: string;
  value: SiteImageValue;
  onChange: (patch: Partial<SiteImageValue>) => void;
  /** Purely decorative: no description for screen readers. */
  decorative?: boolean;
  accept?: string;
  removeLabel?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const client = createClient();
      const path = await uploadSiteImage(client, file, folder);
      onChange({
        imagePath: path,
        imageUrl: supportAreaImageUrl(client, path),
      });
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Nie udało się wgrać zdjęcia",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid content-start gap-1.5 sm:col-span-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {value.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a preview of the stored file
          <img
            alt=""
            className="size-10 rounded-[5px] border border-[var(--border)] object-cover"
            src={value.imageUrl}
          />
        ) : null}
        <label className={cn(DETAIL_BUTTON, "cursor-pointer")}>
          <ImagePlus aria-hidden="true" />
          {uploading ? "Wgrywanie…" : value.imagePath ? "Zmień" : "Dodaj"}
          <input
            accept={accept}
            aria-label={label}
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
            type="file"
          />
        </label>
        {value.imagePath ? (
          <button
            className={DETAIL_BUTTON}
            onClick={() => onChange({ imagePath: null, imageUrl: null })}
            type="button"
          >
            {removeLabel}
          </button>
        ) : null}
        <span className="text-[0.75rem] text-[var(--text-muted)]">{hint}</span>
      </div>
      {value.imagePath && !decorative ? (
        <>
          <Label htmlFor={`${id}-alt`}>Opis zdjęcia dla czytników ekranu</Label>
          <Input
            id={`${id}-alt`}
            maxLength={200}
            onChange={(event) => onChange({ imageAlt: event.target.value })}
            value={value.imageAlt}
          />
        </>
      ) : null}
    </div>
  );
}
