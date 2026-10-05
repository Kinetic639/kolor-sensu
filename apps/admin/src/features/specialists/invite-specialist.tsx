"use client";

import { InviteDialog } from "@/features/center/access-tab";
import { Button } from "@repo/ui/button";
import { UserPlus } from "lucide-react";
import { useState } from "react";

// Specjaliści: a new specialist invited by e-mail (an account, the role
// and their profile to fill in; the invitation's link signs them in to
// the specialist's portal to set a password).

export function InviteSpecialistButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="h-7 rounded-[5px] px-2.5 text-[0.75rem]"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
      >
        <UserPlus aria-hidden="true" />
        Zaproś specjalistę
      </Button>
      {open ? (
        <InviteDialog onClose={() => setOpen(false)} role="specialist" />
      ) : null}
    </>
  );
}
