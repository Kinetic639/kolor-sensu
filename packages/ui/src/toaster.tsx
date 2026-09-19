"use client";

import type { ComponentProps } from "react";
import { Toaster as SonnerToaster } from "sonner";

export type AppToasterProps = ComponentProps<typeof SonnerToaster>;

export function AppToaster(props: AppToasterProps) {
  return <SonnerToaster position="top-right" {...props} />;
}
