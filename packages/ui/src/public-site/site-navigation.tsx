"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "../lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../navigation-menu";
import type { SiteNavItem } from "./site-types";

// Desktop navigation (shadcn NavigationMenu, restyled for the public site):
// plain links, and a dropdown for items with children ("Oferta"). A client
// component only for the dropdown's keyboard and pointer handling; the links
// themselves are in the server HTML.

export function isCurrent(href: string, currentPath?: string) {
  if (!currentPath) return false;
  return href === "/"
    ? currentPath === "/"
    : currentPath === href || currentPath.startsWith(`${href}/`);
}

const itemStyle =
  "text-small text-ink inline-flex h-10 items-center rounded-full px-3.5 font-medium transition-colors hover:bg-cream focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 data-[active=true]:text-primary-strong";

export interface SiteNavigationProps {
  items: readonly SiteNavItem[];
  currentPath?: string;
  className?: string;
}

export function SiteNavigation({
  items,
  currentPath,
  className,
}: SiteNavigationProps) {
  return (
    <NavigationMenu
      viewport={false}
      aria-label="Główna"
      className={cn("ks-site-nav", className)}
    >
      <NavigationMenuList className="gap-0.5">
        {items.map((item) => {
          const active = isCurrent(item.href, currentPath);
          return item.children?.length ? (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuTrigger
                data-active={active}
                className={cn(
                  itemStyle,
                  "data-[state=open]:bg-cream hover:bg-cream h-10 bg-transparent py-0",
                )}
              >
                {item.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent className="bg-surface border-border/70 shadow-card-hover rounded-card-lg! p-3! md:w-[34rem]">
                <ul className="grid grid-cols-2 gap-1">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <NavigationMenuLink
                        asChild
                        active={isCurrent(child.href, currentPath)}
                      >
                        <Link
                          href={child.href}
                          className="hover:bg-cream focus-visible:outline-ring rounded-card grid gap-1 p-3 focus-visible:outline-2"
                        >
                          <span className="text-small text-ink font-semibold">
                            {child.label}
                          </span>
                          {child.description ? (
                            <span className="text-small text-text-muted leading-snug">
                              {child.description}
                            </span>
                          ) : null}
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
                <NavigationMenuLink asChild>
                  <Link
                    href={item.href}
                    className="text-small text-ink hover:bg-cream group/all mt-1 flex-row items-center gap-1.5 rounded-full px-3 py-2 font-semibold"
                  >
                    {`Cała ${item.label.toLowerCase()}`}
                    <ArrowRight
                      aria-hidden="true"
                      className="ease-soft size-3.5 transition-transform group-hover/all:translate-x-0.5"
                      strokeWidth={1.75}
                    />
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuLink asChild active={active}>
                <Link
                  href={item.href}
                  className={cn(itemStyle, "flex-row p-0 px-3.5")}
                >
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
