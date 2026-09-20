"use client";

import {
  getHomeContentAction,
  publishHomeContentAction,
  updateHomeDraftAction,
} from "@/features/cms/actions";
import { homeContentKeys } from "@/features/cms/query-keys";
import type { HomeContentViewModel } from "@/features/cms/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { homePageContentSchema, type HomePageContent } from "@repo/contracts";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { SectionHeader } from "@repo/ui/portal-content";
import { Textarea } from "@repo/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type HomePageContentInput = z.input<typeof homePageContentSchema>;

function EditHomeContentDialog({ content }: { content: HomeContentViewModel }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const defaultValues: HomePageContentInput = {
    heading: content.heading,
    body: content.body,
    buttonLabel: content.buttonLabel,
  };
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<HomePageContentInput, unknown, HomePageContent>({
    resolver: zodResolver(homePageContentSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: (input: HomePageContent) => updateHomeDraftAction(input),
    onSuccess: (next) => {
      queryClient.setQueryData(homeContentKeys.detail(), next);
      toast.success("Zapisano szkic");
      setOpen(false);
    },
    onError: () => toast.error("Nie udało się zapisać treści"),
  });

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset(defaultValues);
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">Edytuj treść</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Treść strony głównej</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="space-y-1.5">
            <Label htmlFor="heading">Nagłówek</Label>
            <Input id="heading" {...register("heading")} />
            {errors.heading ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {errors.heading.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Treść</Label>
            <Textarea id="body" rows={5} {...register("body")} />
            {errors.body ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {errors.body.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buttonLabel">
              Etykieta przycisku (opcjonalnie)
            </Label>
            <Input id="buttonLabel" {...register("buttonLabel")} />
          </div>
          <DialogFooter>
            <Button
              disabled={mutation.isPending}
              loading={mutation.isPending}
              type="submit"
            >
              Zapisz szkic
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CmsHomeEditor({
  initialData,
}: {
  initialData: HomeContentViewModel;
}) {
  const queryClient = useQueryClient();
  const { data: content } = useQuery({
    queryKey: homeContentKeys.detail(),
    queryFn: () => getHomeContentAction(),
    initialData,
  });

  const publishMutation = useMutation({
    mutationFn: () => publishHomeContentAction(),
    onSuccess: (next) => {
      queryClient.setQueryData(homeContentKeys.detail(), next);
      toast.success("Strona główna opublikowana");
    },
    onError: () => toast.error("Publikacja się nie powiodła"),
  });

  return (
    <Card className="space-y-4 p-5">
      <SectionHeader title="Strona główna" />
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={content.isPublished ? "success" : "neutral"}>
          {content.isPublished ? "Opublikowana" : "Nieopublikowana"}
        </Badge>
        {content.isPublished && content.hasUnpublishedChanges ? (
          <Badge variant="warning">Niepublikowane zmiany</Badge>
        ) : null}
        <span className="text-xs text-[var(--text-muted)]">
          Ostatnia aktualizacja: {content.updatedAtLabel}
        </span>
        {content.publishedAtLabel ? (
          <span className="text-xs text-[var(--text-muted)]">
            Ostatnia publikacja: {content.publishedAtLabel}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        <EditHomeContentDialog content={content} />
        <Button asChild variant="outline">
          <Link href="/cms/preview">Podgląd</Link>
        </Button>
        <Button
          disabled={publishMutation.isPending}
          loading={publishMutation.isPending}
          onClick={() => publishMutation.mutate()}
        >
          Publikuj
        </Button>
      </div>
    </Card>
  );
}
