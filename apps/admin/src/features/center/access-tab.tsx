"use client";

import { useSave } from "@/lib/use-save";
import { adminInviteSchema, type AdminInvite } from "@repo/contracts/access";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { DETAIL_BUTTON, DetailSection, ROW_LINE } from "@repo/ui/detail-page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { toast } from "@repo/ui/toast";
import { Tag } from "@repo/ui/visit-table";
import { Copy, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  grantAdminAction,
  inviteAdminAction,
  revokeAdminAction,
} from "./access-actions";
import type { AccessRow } from "./access-view";

// Ustawienia → Dostęp: who may use this portal. Every portal user (the
// admins first) with their roles and when they last came; a specialist
// is given the admin's access, an admin's is taken back (not one's own,
// not the last one's), a new admin is invited by e-mail. The invitation's
// link is shown too, to pass on when the e-mail does not reach them.

const blank: AdminInvite = { email: "", firstName: "", lastName: "" };

function InviteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(blank);
  const [errors, setErrors] = useState<
    Partial<Record<keyof AdminInvite, string>>
  >({});
  const [sent, setSent] = useState<{ link: string; emailed: boolean } | null>(
    null,
  );

  const invite = () => {
    const checked = adminInviteSchema.safeParse(draft);
    if (!checked.success) {
      setErrors(
        Object.fromEntries(
          checked.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    setErrors({});
    startTransition(async () => {
      const answer = await inviteAdminAction(checked.data);
      if (!answer.ok) {
        if (answer.fields) setErrors(answer.fields);
        toast.error(answer.message);
        return;
      }
      router.refresh();
      if (answer.status === "granted") {
        toast.success("Nadano dostęp administratora");
        onClose();
        return;
      }
      toast.success("Wysłano zaproszenie");
      setSent({ link: answer.link ?? "", emailed: Boolean(answer.emailed) });
    });
  };

  const field = (key: keyof AdminInvite, label: string, type = "text") => (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={`invite-${key}`}>{label}</Label>
      <Input
        aria-describedby={errors[key] ? `invite-${key}-error` : undefined}
        aria-invalid={errors[key] ? true : undefined}
        autoComplete="off"
        id={`invite-${key}`}
        onChange={(event) =>
          setDraft((was) => ({ ...was, [key]: event.target.value }))
        }
        type={type}
        value={draft[key]}
      />
      {errors[key] ? (
        <p
          className="text-[0.75rem] text-[var(--danger)]"
          id={`invite-${key}-error`}
        >
          {errors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <Dialog onOpenChange={(open) => (open ? null : onClose())} open>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Zaproś administratora</DialogTitle>
          <DialogDescription>
            Dostanie e-mail z linkiem do ustawienia hasła. Jeśli adres ma już
            konto (np. specjalisty), dostęp zostanie nadany od razu.
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <div className="grid gap-2">
            <p className="text-[0.8125rem] text-[var(--text)]">
              {sent.emailed
                ? `Zaproszenie poszło na ${draft.email}.`
                : `Nie udało się wysłać e-maila na ${draft.email}. Przekaż ten link.`}{" "}
              Link działa przez ograniczony czas:
            </p>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Link zaproszenia"
                className="font-mono text-[0.75rem]"
                onFocus={(event) => event.currentTarget.select()}
                readOnly
                value={sent.link}
              />
              <button
                className={DETAIL_BUTTON}
                onClick={() =>
                  navigator.clipboard.writeText(sent.link).then(
                    () => toast.success("Skopiowano link"),
                    () => toast.error("Nie udało się skopiować"),
                  )
                }
                type="button"
              >
                <Copy aria-hidden="true" />
                Kopiuj
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3.5">
            {field("email", "E-mail", "email")}
            <div className="grid gap-3 sm:grid-cols-2">
              {field("firstName", "Imię")}
              {field("lastName", "Nazwisko")}
            </div>
          </div>
        )}
        <DialogFooter>
          {sent ? (
            <Button onClick={onClose} size="sm" type="button">
              Gotowe
            </Button>
          ) : (
            <>
              <Button
                onClick={onClose}
                size="sm"
                type="button"
                variant="secondary"
              >
                Anuluj
              </Button>
              <Button
                loading={pending}
                onClick={invite}
                size="sm"
                type="button"
              >
                Zaproś
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccessButton({ row }: { row: AccessRow }) {
  const { isPending, run } = useSave();
  const [open, setOpen] = useState(false);
  if (row.canGrant) {
    return (
      <>
        <button
          className={DETAIL_BUTTON}
          disabled={isPending}
          onClick={() => setOpen(true)}
          type="button"
        >
          Nadaj dostęp admina
        </button>
        <AlertDialog onOpenChange={setOpen} open={open}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Nadać dostęp administratora?</AlertDialogTitle>
              <AlertDialogDescription>
                {row.name} zobaczy cały panel centrum: rezerwacje, klientów,
                rozliczenia i ustawienia.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  run(() => grantAdminAction(row.id), "Nadano dostęp")
                }
              >
                Nadaj dostęp
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
  if (!row.canRevoke) return null;
  return (
    <>
      <button
        className={`${DETAIL_BUTTON} text-[var(--danger)]`}
        disabled={isPending}
        onClick={() => setOpen(true)}
        type="button"
      >
        Odbierz dostęp
      </button>
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odebrać dostęp administratora?</AlertDialogTitle>
            <AlertDialogDescription>
              {row.name} nie wejdzie już do panelu centrum.
              {row.isSpecialist
                ? " Portal specjalisty zostaje."
                : " Konto zostaje, można je zaprosić ponownie."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                run(() => revokeAdminAction(row.id), "Odebrano dostęp")
              }
            >
              Odbierz dostęp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AccessTab({ rows }: { rows: AccessRow[] }) {
  const [inviting, setInviting] = useState(false);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--surface)]">
      <DetailSection
        actions={
          <button
            className={DETAIL_BUTTON}
            onClick={() => setInviting(true)}
            type="button"
          >
            <UserPlus aria-hidden="true" />
            Zaproś administratora
          </button>
        }
        note="kto wchodzi do panelu centrum"
        title="Dostęp"
      >
        <ul>
          {rows.map((row) => (
            <li
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3.5 py-2 last:border-b-0 ${ROW_LINE}`}
              key={row.id}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[0.8125rem] font-medium text-[var(--text)]">
                  {row.name}
                  {row.isMe ? (
                    <span className="font-normal text-[var(--text-muted)]">
                      {" "}
                      (Ty)
                    </span>
                  ) : null}
                </span>
                <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
                  {row.email}
                </span>
                {row.roles.map((role) => (
                  <Tag
                    key={role}
                    tone={role === "Administrator" ? "success" : "info"}
                  >
                    {role}
                  </Tag>
                ))}
                <span className="text-[0.75rem] text-[var(--text-muted)]">
                  {row.seen}
                </span>
              </div>
              <AccessButton row={row} />
            </li>
          ))}
        </ul>
      </DetailSection>
      {inviting ? <InviteDialog onClose={() => setInviting(false)} /> : null}
    </div>
  );
}
