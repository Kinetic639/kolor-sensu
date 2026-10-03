"use client";

import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@repo/ui/toast";
import { createServiceAction } from "./actions";
import { ServiceForm } from "./service-form";

/** Adds a service to the catalogue, then opens its page. */
export function NewServiceButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: createServiceAction,
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      toast.success("Usługa została utworzona");
      router.push(`/oferta/${result.serviceId}` as Route);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" className="size-4" />
          Dodaj usługę
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nowa usługa</DialogTitle>
          <DialogDescription>
            Dodaj usługę do globalnego katalogu centrum.
          </DialogDescription>
        </DialogHeader>
        <ServiceForm
          error={error}
          onSubmit={(values) => create.mutate(values)}
          pending={create.isPending}
          submitLabel="Utwórz usługę"
        />
      </DialogContent>
    </Dialog>
  );
}
