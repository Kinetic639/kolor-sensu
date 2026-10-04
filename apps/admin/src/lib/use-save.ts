"use client";

import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

// A form's save: the action runs in a transition, a toast says how it
// went, and the page renders again with what was saved.

export type ActionResult = { ok: true } | { ok: false; message: string };

export function useSave() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function run(
    action: () => Promise<ActionResult>,
    success: string,
    after?: () => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(success);
      after?.();
      router.refresh();
    });
  }
  return { isPending, run };
}
