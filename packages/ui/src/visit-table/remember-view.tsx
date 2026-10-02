"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { rememberedView, viewCookieName, viewQuery } from "./view-cookie";

// Remembers a table's last view in a cookie, from the address. A page
// opened afresh without one is sent back there by the server; one reached
// from the menu (a move within the app) is sent back here, once, on
// arrival. Later changes on the page, clearing every filter too, are saved.

function savedView(table: string) {
  const name = `${viewCookieName(table)}=`;
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(name))
    ?.slice(name.length);
}

export function RememberView({ table }: { table: string }) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const query = viewQuery(new URLSearchParams(search.toString()));
  const arrived = useRef(false);
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      const back = query ? null : rememberedView(path, savedView(table));
      if (back) {
        router.replace(back as Route);
        return;
      }
    }
    // An empty view is remembered too: the defaults are a choice.
    document.cookie = `${viewCookieName(table)}=${encodeURIComponent(
      query || "-",
    )}; path=/; max-age=31536000; samesite=lax`;
  }, [path, query, router, table]);
  return null;
}
