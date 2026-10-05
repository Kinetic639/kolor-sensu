"use client";

import type { ClientDuplicate } from "@repo/supabase";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { toast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { Merge } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { findClientsAction, mergeClientAction } from "./actions";

// A client's card: one person booked under two addresses is two clients.
// The other card (suggested: the same name or phone; or found by name,
// e-mail or phone) is merged into this one: its visits come over, those
// to come take this card's details, the notes are put together.

const movedLabel = (count: number) =>
  count === 1
    ? "1 wizyta przeniesiona"
    : count % 10 >= 2 &&
        count % 10 <= 4 &&
        (count % 100 < 12 || count % 100 > 14)
      ? `${count} wizyty przeniesione`
      : `${count} wizyt przeniesionych`;

type Candidate = Pick<ClientDuplicate, "id" | "name" | "email" | "phone"> & {
  reason?: ClientDuplicate["reason"];
};

export function MergeClientButton({
  clientId,
  name,
  email,
  duplicates,
}: {
  clientId: string;
  name: string;
  email: string;
  duplicates: ClientDuplicate[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Candidate[]>([]);
  const [chosen, setChosen] = useState<Candidate | null>(null);
  const [pending, startTransition] = useTransition();

  // The search, a moment after typing stops.
  useEffect(() => {
    if (query.trim().length < 2) {
      setFound([]);
      return;
    }
    let current = true;
    const timer = setTimeout(() => {
      findClientsAction(query).then(
        (clients) =>
          current && setFound(clients.filter((one) => one.id !== clientId)),
        () => current && setFound([]),
      );
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, clientId]);

  const list: Candidate[] = query.trim().length >= 2 ? found : duplicates;

  const merge = () => {
    if (!chosen) return;
    startTransition(async () => {
      const result = await mergeClientAction(clientId, chosen.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Połączono: ${movedLabel(result.moved)}`);
      setOpen(false);
      setChosen(null);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="secondary"
      >
        <Merge aria-hidden="true" />
        Połącz
        {duplicates.length ? (
          <span className="rounded-[4px] bg-[var(--warning-soft)] px-1 text-[0.6875rem] text-[var(--warning-foreground)]">
            {duplicates.length}
          </span>
        ) : null}
      </Button>
      <Dialog
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setChosen(null);
        }}
        open={open}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Połącz z innym klientem</DialogTitle>
            <DialogDescription>
              Wybierz kartę tej samej osoby. Jej wizyty przejdą do „{name}”, a
              nadchodzące dostaną adres {email}. Wybrana karta zniknie.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Input
              aria-label="Szukaj klienta"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Szukaj po imieniu, e-mailu lub telefonie"
              value={query}
            />
            <p className="text-[0.75rem] text-[var(--text-muted)]">
              {query.trim().length >= 2
                ? found.length
                  ? "Wyniki wyszukiwania"
                  : "Nikogo nie znaleziono."
                : duplicates.length
                  ? "Możliwe duplikaty (to samo imię i nazwisko lub telefon)"
                  : "Brak podobnych kart. Wyszukaj klienta."}
            </p>
            {list.length ? (
              <ul
                aria-label="Klienci do połączenia"
                className="max-h-64 overflow-y-auto rounded-[6px] border border-[var(--border)]"
                role="listbox"
              >
                {list.map((one) => {
                  const selected = chosen?.id === one.id;
                  return (
                    <li
                      aria-selected={selected}
                      className={cn(
                        "grid cursor-pointer gap-0.5 border-b border-[var(--border)] px-3 py-2 last:border-b-0 hover:bg-[var(--surface-muted)]",
                        selected &&
                          "bg-[var(--surface-muted)] shadow-[inset_2px_0_0_var(--primary)]",
                      )}
                      key={one.id}
                      onClick={() => setChosen(one)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setChosen(one);
                        }
                      }}
                      role="option"
                      tabIndex={0}
                    >
                      <span className="text-[0.8125rem] font-medium text-[var(--text)]">
                        {one.name}
                        {one.reason ? (
                          <span className="font-normal text-[var(--text-muted)]">
                            {" "}
                            ·{" "}
                            {one.reason === "phone"
                              ? "ten sam telefon"
                              : "to samo imię"}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[0.75rem] text-[var(--text-muted)]">
                        {[one.email, one.phone].filter(Boolean).join(" · ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              size="sm"
              type="button"
              variant="secondary"
            >
              Anuluj
            </Button>
            <Button
              disabled={!chosen}
              loading={pending}
              onClick={merge}
              size="sm"
              type="button"
            >
              {chosen ? `Połącz z „${chosen.name}”` : "Połącz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
