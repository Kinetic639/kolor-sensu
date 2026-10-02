"use client";

import { Slot } from "@radix-ui/react-slot";
import { PanelLeft } from "lucide-react";
import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { cn } from "./lib/utils";
import { Sheet, SheetContent, SheetTitle } from "./sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const SIDEBAR_COOKIE_NAME = "kolor_sensu_sidebar";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const TABLET_BREAKPOINT = 1024;

interface SidebarContextValue {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider.");
  }
  return context;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(
      `(max-width: ${TABLET_BREAKPOINT - 1}px)`,
    );
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export interface SidebarProviderProps extends React.ComponentProps<"div"> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = openProp ?? internalOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
      if (openProp === undefined) setInternalOpen(nextOpen);
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
    },
    [onOpenChange, openProp],
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((current) => !current);
      return;
    }
    setOpen(!open);
  }, [isMobile, open, setOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Chrome fires keydown without `key` when it autofills a form field.
      if (
        event.key?.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";
  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state,
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, openMobile, isMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider delayDuration={150}>
        <div
          className={cn(
            "flex min-h-screen w-full bg-[var(--background)]",
            className,
          )}
          style={
            {
              "--sidebar-width": "var(--ks-sidebar-width)",
              "--sidebar-width-icon": "4rem",
              ...style,
            } as React.CSSProperties
          }
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

export interface SidebarProps extends React.ComponentProps<"div"> {
  side?: "left" | "right";
  collapsible?: "icon" | "offcanvas" | "none";
}

export function Sidebar({
  side = "left",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <aside
        className={cn(
          "flex h-full w-[var(--sidebar-width)] flex-col bg-[var(--surface)] text-[var(--text)]",
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          className="w-[var(--sidebar-width)] p-0 sm:max-w-[var(--sidebar-width)] [&>button:last-child]:top-2 [&>button:last-child]:right-2"
          data-sidebar="sidebar"
          side={side}
        >
          <SheetTitle className="sr-only">Nawigacja portalu</SheetTitle>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group/sidebar peer hidden text-[var(--text)] lg:block"
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-side={side}
      data-state={state}
    >
      <div
        className={cn(
          "relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=icon]/sidebar:w-[var(--sidebar-width-icon)]",
          "group-data-[collapsible=offcanvas]/sidebar:w-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 z-40 hidden h-screen w-[var(--sidebar-width)] border-[var(--border)] bg-[var(--surface)] transition-[left,right,width] duration-200 ease-linear lg:flex",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          "group-data-[collapsible=icon]/sidebar:w-[var(--sidebar-width-icon)]",
          side === "left"
            ? "group-data-[collapsible=offcanvas]/sidebar:left-[calc(var(--sidebar-width)*-1)]"
            : "group-data-[collapsible=offcanvas]/sidebar:right-[calc(var(--sidebar-width)*-1)]",
          className,
        )}
        data-sidebar="sidebar"
        {...props}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          {children}
        </div>
      </aside>
    </div>
  );
}

export function SidebarTrigger({ className, onClick, ...props }: ButtonProps) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      className={cn("size-9", className)}
      size="icon"
      variant="ghost"
      aria-label="Przełącz nawigację"
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="size-5" aria-hidden="true" />
    </Button>
  );
}

export function SidebarRail({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      className={cn(
        "absolute inset-y-0 -right-2 z-50 hidden w-4 cursor-w-resize after:absolute after:inset-y-0 after:left-1/2 after:w-px hover:after:bg-[var(--border-strong)] lg:block",
        "group-data-[state=collapsed]/sidebar:cursor-e-resize",
        className,
      )}
      type="button"
      aria-label="Przełącz nawigację"
      onClick={toggleSidebar}
      tabIndex={-1}
      {...props}
    />
  );
}

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative flex min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-2 p-3", className)} {...props} />
  );
}

export function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-2 p-3", className)} {...props} />
  );
}

export function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex w-full min-w-0 flex-col px-2 py-1",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A group's title; collapsed to icons, a thin line between the groups
 * instead (a hidden title would leave a gap, or lie over the icons).
 */
export function SidebarGroupLabel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mb-0.5 flex h-6 items-center px-2 text-[0.6875rem] font-semibold tracking-[0.04em] text-[var(--text-muted)]",
        "group-data-[collapsible=icon]/sidebar:mb-2 group-data-[collapsible=icon]/sidebar:h-3 group-data-[collapsible=icon]/sidebar:px-3",
        className,
      )}
      {...props}
    >
      <span className="group-data-[collapsible=icon]/sidebar:hidden">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="hidden h-px w-full bg-[var(--sidebar-border,var(--border))] group-data-[collapsible=icon]/sidebar:block"
        data-sidebar-separator=""
      />
    </div>
  );
}

export function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("w-full text-sm", className)} {...props} />;
}

export function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

export function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return <li className={cn("relative", className)} {...props} />;
}

export interface SidebarMenuButtonProps extends React.ComponentProps<"button"> {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string;
}

export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  tooltip,
  className,
  ...props
}: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();
  const button = (
    <Comp
      className={cn(
        "flex min-h-[30px] w-full items-center gap-2.5 overflow-hidden rounded-[6px] px-2 text-left text-[0.8125rem] font-medium text-[var(--text)] transition-[width,padding,background-color,color] outline-none hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        "group-data-[collapsible=icon]/sidebar:mx-auto group-data-[collapsible=icon]/sidebar:size-8 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:px-0",
        "[&>svg]:size-4 [&>svg]:shrink-0",
        isActive &&
          "bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)]",
        className,
      )}
      data-active={isActive}
      {...props}
    />
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        align="center"
        hidden={state !== "collapsed" || isMobile}
        side="right"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
