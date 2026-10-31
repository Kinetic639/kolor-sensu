"use client";
import { useState } from "react";
import type { HomeStoryMedia } from "@repo/contracts";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { ListItemControls } from "./list-item-controls";
import { moveItem } from "./list-editor";

export interface StoryMediaOption {
  id: string;
  title: string;
  imageUrl: string | null;
  detail?: string;
}
export interface StoryMediaOptions {
  articles: StoryMediaOption[];
  ebooks: StoryMediaOption[];
  workshops: StoryMediaOption[];
}
const labels = {
  image: "Zdjęcie",
  articles: "Artykuły",
  ebooks: "E-booki",
  workshops: "Warsztat",
} as const;
const limits = { articles: 3, ebooks: 2, workshops: 1 };
const selectClass =
  "h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]";
export function StoryMediaFields({
  id,
  value,
  options,
  onChange,
  invalid,
}: {
  id: string;
  value: HomeStoryMedia;
  options: StoryMediaOptions;
  onChange: (media: HomeStoryMedia) => void;
  invalid?: boolean;
}) {
  const [query, setQuery] = useState("");
  const collection = value.type === "image" ? null : value;
  const available = collection ? options[collection.type] : [];
  const setIds = (ids: string[]) => {
    if (!collection) return;
    onChange(
      collection.type === "ebooks"
        ? {
            ...collection,
            ids,
            mobilePrimaryId:
              collection.mobilePrimaryId &&
              ids.includes(collection.mobilePrimaryId)
                ? collection.mobilePrimaryId
                : null,
          }
        : { ...collection, ids },
    );
  };
  return (
    <div className="grid gap-2.5 sm:col-span-2">
      <Label htmlFor={`${id}-type`}>Zawartość slajdu</Label>
      <select
        id={`${id}-type`}
        className={selectClass}
        value={value.type}
        onChange={(e) => {
          const type = e.target.value as HomeStoryMedia["type"];
          onChange(
            type === "image" ? { type } : { type, source: "auto", ids: [] },
          );
          setQuery("");
        }}
      >
        {Object.entries(labels).map(([type, label]) => (
          <option key={type} value={type}>
            {label}
          </option>
        ))}
      </select>
      {collection ? (
        <>
          <Label htmlFor={`${id}-source`}>Dobór materiałów</Label>
          <select
            id={`${id}-source`}
            className={selectClass}
            value={collection.source}
            onChange={(e) =>
              onChange({
                ...collection,
                source: e.target.value as "auto" | "manual",
                ...(collection.type === "ebooks" &&
                e.target.value === "manual" &&
                collection.mobilePrimaryId &&
                !collection.ids.includes(collection.mobilePrimaryId)
                  ? { mobilePrimaryId: null }
                  : {}),
              })
            }
          >
            <option value="auto">
              Automatycznie —{" "}
              {collection.type === "workshops"
                ? "najbliższy nadchodzący"
                : "najnowsze opublikowane"}
            </option>
            <option value="manual">Wybieram ręcznie</option>
          </select>
          <p className="text-xs text-[var(--text-muted)]">
            {collection.type === "articles"
              ? "Galeria do 3 artykułów. Automatycznie od najnowszego lub w ręcznie wybranej kolejności. Link do wszystkich artykułów ustawisz poniżej."
              : collection.type === "ebooks"
                ? "Do 2 e-booków z aktualnymi okładkami i tytułami."
                : "Jeden nadchodzący warsztat z aktualną datą i miejscem."}
          </p>
          {collection.source === "manual" ? (
            <>
              <Label htmlFor={`${id}-search`}>Szukaj materiału</Label>
              <Input
                id={`${id}-search`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Wpisz fragment tytułu"
              />
              <fieldset
                aria-label="Dostępne materiały"
                className="grid max-h-64 gap-1 overflow-auto rounded border border-[var(--border)] p-2"
              >
                {!available.length ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Brak opublikowanych materiałów tego rodzaju.
                  </p>
                ) : null}
                {available
                  .filter((item) =>
                    item.title
                      .toLocaleLowerCase("pl")
                      .includes(query.toLocaleLowerCase("pl")),
                  )
                  .map((item) => (
                    <label
                      key={item.id}
                      className="flex min-h-11 items-center gap-2 rounded p-1 text-sm hover:bg-[var(--surface-muted)]"
                    >
                      <input
                        type="checkbox"
                        checked={collection.ids.includes(item.id)}
                        disabled={
                          !collection.ids.includes(item.id) &&
                          collection.ids.length >= limits[collection.type]
                        }
                        onChange={(e) =>
                          setIds(
                            e.target.checked
                              ? [...collection.ids, item.id]
                              : collection.ids.filter((one) => one !== item.id),
                          )
                        }
                      />
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- stored-file thumbnail, like SiteImageField
                        <img
                          width={40}
                          height={40}
                          className="size-10 object-contain"
                          src={item.imageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      <span>
                        {item.title}
                        {item.detail ? (
                          <span className="block text-xs text-[var(--text-muted)]">
                            {item.detail}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
              </fieldset>
              <ol
                className="grid gap-1"
                aria-label="Kolejność wybranych materiałów"
              >
                {collection.ids.map((chosen, index) => {
                  const item = available.find((one) => one.id === chosen);
                  return (
                    <li
                      key={chosen}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {index + 1}.{" "}
                        {item?.title ??
                          "Materiał wycofany — na stronie zostanie pominięty"}
                      </span>
                      <ListItemControls
                        name={item?.title ?? "Wycofany materiał"}
                        canMoveUp={index > 0}
                        canMoveDown={index < collection.ids.length - 1}
                        canRemove
                        onMove={(by) =>
                          setIds([...moveItem(collection.ids, index, by)])
                        }
                        onRemove={() =>
                          setIds(collection.ids.filter((one) => one !== chosen))
                        }
                      />
                    </li>
                  );
                })}
              </ol>
              {invalid || !collection.ids.length ? (
                <p role="alert" className="text-xs text-[var(--danger)]">
                  Wybierz od 1 do {limits[collection.type]} materiałów.
                </p>
              ) : null}
            </>
          ) : null}
          {collection.type === "ebooks" ? (
            <>
              <Label htmlFor={`${id}-mobile-primary`}>
                Główny e-book na telefonie
              </Label>
              <select
                id={`${id}-mobile-primary`}
                className={selectClass}
                value={collection.mobilePrimaryId ?? ""}
                onChange={(event) =>
                  onChange({
                    ...collection,
                    mobilePrimaryId: event.target.value || null,
                  })
                }
              >
                <option value="">Pierwszy dostępny e-book</option>
                {available
                  .filter(
                    (book) =>
                      collection.source === "auto" ||
                      collection.ids.includes(book.id),
                  )
                  .map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                    </option>
                  ))}
                {collection.mobilePrimaryId &&
                !available.some(
                  (book) => book.id === collection.mobilePrimaryId,
                ) ? (
                  <option value={collection.mobilePrimaryId}>
                    Wybrany e-book jest niedostępny — na stronie pojawi się
                    pierwszy dostępny
                  </option>
                ) : null}
              </select>
              <p className="text-xs text-[var(--text-muted)]">
                Na telefonie pokazujemy tylko ten e-book. Na komputerze
                pozostają dwa; w trybie automatycznym główny e-book będzie
                jednym z nich.
              </p>
            </>
          ) : null}
          <p className="text-xs text-[var(--text-muted)]">
            Gdy nie ma dostępnych materiałów, slajd pokaże zdjęcie zastępcze.
            Wycofane i odwołane materiały nie pojawią się na stronie.
          </p>
        </>
      ) : null}
    </div>
  );
}
