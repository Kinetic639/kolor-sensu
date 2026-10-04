"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  arrangeOffer,
  type ServiceArrangement,
  type ServiceCatalog,
} from "@repo/contracts";
import { FolderOpen, FolderPlus, GripVertical, Trash2 } from "lucide-react";
import { useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { Button } from "../button";
import { cn } from "../lib/utils";
import { toast } from "../toast";
import { Tag } from "../visit-table/visit-chips";
import { ServiceMark } from "./service-parts";
import type { ServiceRow } from "./types";

// The offer as the site's menu shows it, arranged in one place: the menu's
// first level (the services outside a catalogue and the catalogues), each
// catalogue with its services. Both lists are dragged by their handles (a
// pointer, or the keyboard: space to lift, arrows, space to put down); a
// service changes catalogue by its "Katalog" field. Catalogues are added,
// named and removed (their services go back to the first level). Nothing
// is saved until "Zapisz układ", and then all of it at once.

type Item = Pick<
  ServiceRow,
  "id" | "name" | "category" | "paint" | "active" | "publiclyVisible"
> & { catalogId: string | null; sortOrder: number };

export type ArrangeAction = (
  arrangement: ServiceArrangement,
) => Promise<{ ok: true } | { ok: false; message: string }>;

interface Draft {
  catalogs: { key: string; id: string | null; name: string }[];
  /** The first level: service ids and catalogue keys. */
  order: string[];
  /** Each catalogue's services, by its key. */
  members: Record<string, string[]>;
}

const TOP = "top";
const catalogKey = (id: string) => `catalog:${id}`;

function draftOf(items: Item[], catalogs: ServiceCatalog[]): Draft {
  const entries = arrangeOffer(items, catalogs, { keepEmpty: true });
  const members: Record<string, string[]> = {};
  const order = entries.map((entry) => {
    if (entry.kind === "service") return entry.service.id;
    const key = catalogKey(entry.catalog.id);
    members[key] = entry.services.map((service) => service.id);
    return key;
  });
  return {
    catalogs: catalogs.map((catalog) => ({
      key: catalogKey(catalog.id),
      id: catalog.id,
      name: catalog.name,
    })),
    order,
    members,
  };
}

/** What the draft saves: the catalogues, the first level, each service's catalogue. */
export function arrangementOf(draft: Draft): ServiceArrangement {
  const services: ServiceArrangement["services"] = [];
  for (const key of draft.order) {
    if (key in draft.members) {
      for (const id of draft.members[key]!) {
        services.push({ id, catalogKey: key });
      }
    } else {
      services.push({ id: key, catalogKey: null });
    }
  }
  return {
    catalogs: draft.catalogs.map((catalog) => ({
      ...catalog,
      name: catalog.name.trim(),
    })),
    order: draft.order,
    services,
  };
}

function SortableRow({
  id,
  container,
  dragging,
  label,
  children,
  className,
}: {
  id: string;
  container: string;
  /** The list being dragged in: the others take no drop. */
  dragging: string | null;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { container },
    disabled: { droppable: dragging !== null && dragging !== container },
  });
  return (
    <li
      className={cn(
        "bg-[var(--surface)]",
        isDragging && "relative z-10 shadow-[0_4px_16px_rgb(16_32_28/0.16)]",
        className,
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex min-h-10 items-center gap-2 px-2">
        <button
          aria-label={`Przesuń: ${label}`}
          className="grid size-7 shrink-0 cursor-grab place-items-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none active:cursor-grabbing"
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
        {children}
      </div>
    </li>
  );
}

export function OfferArrangement({
  items,
  catalogs,
  action,
  onDone,
}: {
  /** Every service. */
  items: Item[];
  catalogs: ServiceCatalog[];
  action: ArrangeAction;
  /** After saving, or giving up (e.g. to close the panel). */
  onDone?: () => void;
}) {
  const initial = useMemo(() => draftOf(items, catalogs), [items, catalogs]);
  const [draft, setDraft] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [made, setMade] = useState(0);
  const base = useId();
  const byId = new Map(items.map((item) => [item.id, item]));
  const catalogByKey = new Map(draft.catalogs.map((one) => [one.key, one]));
  const nameOf = (key: string) =>
    catalogByKey.get(key)?.name || byId.get(key)?.name || "";
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const unnamed = draft.catalogs.some((one) => !one.name.trim());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const listOf = (container: string) =>
    container === TOP ? draft.order : (draft.members[container] ?? []);
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Podniesiono: ${nameOf(String(active.id))}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameOf(String(active.id))}: miejsce ${listOf(String(active.data.current?.container)).indexOf(String(over.id)) + 1}.`
        : `${nameOf(String(active.id))} poza listą.`,
    onDragEnd: ({ active }) => `Odłożono: ${nameOf(String(active.id))}.`,
    onDragCancel: ({ active }) =>
      `Anulowano: ${nameOf(String(active.id))} wraca na miejsce.`,
  };

  const onDragStart = ({ active }: DragStartEvent) =>
    setDragging(String(active.data.current?.container ?? TOP));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    const container = String(active.data.current?.container ?? TOP);
    if (!over || active.id === over.id) return;
    if (over.data.current?.container !== container) return;
    setDraft((now) => {
      const list = container === TOP ? now.order : now.members[container]!;
      const next = arrayMove(
        list,
        list.indexOf(String(active.id)),
        list.indexOf(String(over.id)),
      );
      return container === TOP
        ? { ...now, order: next }
        : { ...now, members: { ...now.members, [container]: next } };
    });
  };

  /** A service to a catalogue (none: the first level), at its end. */
  const moveTo = (serviceId: string, target: string) =>
    setDraft((now) => {
      const members = Object.fromEntries(
        Object.entries(now.members).map(([key, ids]) => [
          key,
          ids.filter((id) => id !== serviceId),
        ]),
      );
      const order = now.order.filter((key) => key !== serviceId);
      if (target === TOP) order.push(serviceId);
      else members[target] = [...(members[target] ?? []), serviceId];
      return { ...now, order, members };
    });

  const addCatalog = () => {
    const key = `new:${made + 1}`;
    setMade((count) => count + 1);
    setDraft((now) => ({
      catalogs: [...now.catalogs, { key, id: null, name: "Nowy katalog" }],
      order: [...now.order, key],
      members: { ...now.members, [key]: [] },
    }));
    // The name, ready to type over.
    requestAnimationFrame(() => {
      const input = document.getElementById(`${base}-${key}`);
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    });
  };

  const rename = (key: string, name: string) =>
    setDraft((now) => ({
      ...now,
      catalogs: now.catalogs.map((one) =>
        one.key === key ? { ...one, name } : one,
      ),
    }));

  /** Gone: its services take its place on the first level. */
  const remove = (key: string) =>
    setDraft((now) => {
      const at = now.order.indexOf(key);
      const order = [...now.order];
      order.splice(at, 1, ...(now.members[key] ?? []));
      const { [key]: _gone, ...members } = now.members;
      return {
        catalogs: now.catalogs.filter((one) => one.key !== key),
        order,
        members,
      };
    });

  const save = () =>
    startTransition(async () => {
      const result = await action(arrangementOf(draft));
      if (result.ok) {
        toast.success("Zapisano układ oferty");
        onDone?.();
      } else {
        toast.error("Nie udało się zapisać układu", {
          description: result.message,
        });
      }
    });

  const catalogField = (item: Item, current: string) => (
    <select
      aria-label={`Katalog: ${item.name}`}
      className="h-7 max-w-[11rem] shrink-0 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-1.5 text-[0.75rem] text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      onChange={(event) => moveTo(item.id, event.target.value)}
      value={current}
    >
      <option value={TOP}>Bez katalogu</option>
      {draft.catalogs.map((one) => (
        <option key={one.key} value={one.key}>
          {one.name.trim() || "Bez nazwy"}
        </option>
      ))}
    </select>
  );

  const serviceRow = (id: string, container: string) => {
    const item = byId.get(id);
    if (!item) return null;
    return (
      <SortableRow
        container={container}
        dragging={dragging}
        id={id}
        key={id}
        label={item.name}
      >
        <ServiceMark service={item} size={24} />
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-[var(--text)]">
          {item.name}
        </span>
        {!item.active ? (
          <Tag tone="neutral">Nieaktywna</Tag>
        ) : !item.publiclyVisible ? (
          <Tag tone="neutral">Ukryta</Tag>
        ) : null}
        {catalogField(item, container)}
      </SortableRow>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto px-4 py-3">
        <p className="text-[0.8125rem] text-[var(--text-muted)]">
          Tak wygląda menu „Oferta” na stronie: usługi poza katalogiem widać od
          razu, katalog otwiera z boku swoje usługi. Usługi nieaktywne i ukryte
          nie trafiają do menu.
        </p>
        <DndContext
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                "Spacja podnosi pozycję, strzałki ją przesuwają, spacja odkłada, Escape anuluje.",
            },
          }}
          collisionDetection={closestCenter}
          onDragCancel={() => setDragging(null)}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
          sensors={sensors}
        >
          <SortableContext
            items={draft.order}
            strategy={verticalListSortingStrategy}
          >
            <ol
              aria-label="Menu Oferta"
              className="grid overflow-hidden rounded-[8px] border border-[var(--border)] [&>li+li]:border-t [&>li+li]:border-[var(--border)]"
            >
              {draft.order.map((key) => {
                const catalog = catalogByKey.get(key);
                if (!catalog) return serviceRow(key, TOP);
                const own = draft.members[key] ?? [];
                return (
                  <SortableRow
                    className="bg-[var(--surface-subtle)] pb-2 [&>div]:items-start [&>div>button]:mt-1.5"
                    container={TOP}
                    dragging={dragging}
                    id={key}
                    key={key}
                    label={catalog.name || "katalog"}
                  >
                    <div className="grid min-w-0 flex-1 gap-2">
                      <div className="flex min-h-10 items-center gap-2">
                        <FolderOpen
                          aria-hidden="true"
                          className="size-4 shrink-0 text-[var(--primary)]"
                        />
                        <input
                          aria-invalid={!catalog.name.trim() || undefined}
                          aria-label="Nazwa katalogu"
                          className="h-7 min-w-0 flex-1 rounded-[5px] border border-transparent bg-transparent px-1.5 text-[0.8125rem] font-semibold text-[var(--text)] hover:border-[var(--border)] focus-visible:border-[var(--border)] focus-visible:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none aria-invalid:border-[var(--danger)]"
                          id={`${base}-${key}`}
                          maxLength={120}
                          onChange={(event) => rename(key, event.target.value)}
                          value={catalog.name}
                        />
                        <span className="shrink-0 text-[0.75rem] text-[var(--text-muted)]">
                          {own.length}
                        </span>
                        <button
                          aria-label={`Usuń katalog: ${catalog.name || "bez nazwy"}`}
                          className="grid size-7 shrink-0 place-items-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--danger)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                          onClick={() => remove(key)}
                          title="Usuń katalog (usługi wrócą na pierwszy poziom)"
                          type="button"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                        </button>
                      </div>
                      <SortableContext
                        items={own}
                        strategy={verticalListSortingStrategy}
                      >
                        {own.length ? (
                          <ol
                            aria-label={`Usługi w katalogu: ${catalog.name}`}
                            className="grid overflow-hidden rounded-[6px] border border-[var(--border)] [&>li+li]:border-t [&>li+li]:border-[var(--border)]"
                          >
                            {own.map((id) => serviceRow(id, key))}
                          </ol>
                        ) : (
                          <p className="rounded-[6px] border border-dashed border-[var(--border)] px-3 py-2 text-[0.75rem] text-[var(--text-muted)]">
                            Pusty katalog nie pokaże się w menu. Wybierz go w
                            polu „Katalog” przy usłudze.
                          </p>
                        )}
                      </SortableContext>
                    </div>
                  </SortableRow>
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
        <Button
          className="h-8 justify-self-start px-2.5 text-[0.8125rem]"
          onClick={addCatalog}
          size="sm"
          type="button"
          variant="secondary"
        >
          <FolderPlus aria-hidden="true" className="size-4" />
          Nowy katalog
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2.5">
        <span
          className={cn(
            "mr-auto text-[0.75rem]",
            unnamed ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
          )}
          role={unnamed ? "alert" : undefined}
        >
          {unnamed
            ? "Każdy katalog musi mieć nazwę."
            : dirty
              ? "Niezapisane zmiany"
              : "Bez zmian"}
        </span>
        <Button
          className="h-8 px-2.5 text-[0.8125rem]"
          disabled={pending}
          onClick={() => {
            setDraft(initial);
            onDone?.();
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          Anuluj
        </Button>
        <Button
          className="h-8 px-2.5 text-[0.8125rem]"
          disabled={!dirty || unnamed}
          loading={pending}
          onClick={save}
          size="sm"
          type="button"
        >
          Zapisz układ
        </Button>
      </div>
    </div>
  );
}
