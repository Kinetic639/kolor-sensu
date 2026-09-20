import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";

export interface AuthShellProps {
  children: ReactNode;
  description: string;
  eyebrow: string;
  footer?: ReactNode;
  title: string;
}

export function AuthShell({
  children,
  description,
  eyebrow,
  footer,
  title,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <CardHeader>
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--primary)] uppercase">
              {eyebrow}
            </p>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
          {footer ? (
            <div className="mt-6 border-t border-[var(--border)] pt-5 text-sm text-[var(--text-muted)]">
              {footer}
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
