import { Check } from "lucide-react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// The booking wizard's steps (docs/product/booking-plan.md): done steps link
// back to change the choice, the current one is marked, the rest wait.

export interface BookingStep {
  key: string;
  label: string;
  /** Where a done step goes back to. */
  href?: string;
  /** A choice supplied out of order, e.g. a specialist selected on their profile. */
  completed?: boolean;
}

export interface BookingStepperProps {
  steps: BookingStep[];
  /** The current step's index. */
  current: number;
  label?: string;
  className?: string;
}

export function BookingStepper({
  steps,
  current,
  label = "Kroki rezerwacji",
  className,
}: BookingStepperProps) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const state =
            step.completed || index < current
              ? "done"
              : index === current
                ? "current"
                : "ahead";
          const name = `Krok ${index + 1}: ${step.label}${
            state === "done" ? " (ukończony)" : ""
          }`;
          const marker = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "text-small flex size-9 items-center justify-center rounded-full border font-semibold sm:size-10",
                  state === "done"
                    ? "border-primary bg-primary text-on-primary"
                    : state === "current"
                      ? "border-ink bg-surface text-ink"
                      : "border-border-strong bg-surface text-text-muted",
                )}
              >
                {state === "done" ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : (
                  index + 1
                )}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 text-center text-[0.6875rem] leading-tight sm:text-sm",
                  state === "done"
                    ? "text-primary-strong font-semibold"
                    : state === "current"
                      ? "text-ink font-semibold"
                      : "text-text-muted",
                )}
              >
                {step.label}
              </span>
            </>
          );
          return (
            <li
              className="relative flex flex-1 flex-col items-center"
              key={step.key}
            >
              {/* The line from the previous step. */}
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-[1.125rem] right-[calc(50%+1.5rem)] left-[calc(-50%+1.5rem)] h-px sm:top-5",
                    state === "ahead" ? "bg-border-strong" : "bg-primary",
                  )}
                />
              ) : null}
              {state === "done" && step.href ? (
                <Link
                  aria-label={name}
                  aria-current={index === current ? "step" : undefined}
                  className="focus-visible:outline-ring flex flex-col items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
                  href={step.href}
                >
                  {marker}
                </Link>
              ) : (
                <span
                  aria-current={state === "current" ? "step" : undefined}
                  aria-label={name}
                  className="flex flex-col items-center"
                  role="group"
                >
                  {marker}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
