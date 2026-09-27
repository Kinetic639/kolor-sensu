import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";
import { PageLink as Link, type PageLinkProps } from "./page-link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "../lib/utils";

// Buttons stay clean and crisp on purpose: paint belongs to images and
// backgrounds, never to controls (reference A: solid green pill + outline pill).
const publicButtonVariants = cva(
  "group/button inline-flex items-center justify-center gap-2 rounded-button font-body font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-soft focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary shadow-button hover:bg-primary-strong",
        secondary:
          "border border-border-strong bg-surface/70 text-ink hover:border-primary hover:bg-surface",
      },
      size: {
        md: "h-12 px-7 text-[0.9375rem]",
        sm: "h-10 px-5 text-small",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface PublicButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    Pick<VariantProps<typeof publicButtonVariants>, "size"> {
  /** Render the child element (e.g. next/link <Link>) with button styles. */
  asChild?: boolean;
  /** Trailing arrow, as on "Umów wizytę →". */
  arrow?: boolean;
}

function PublicButton({
  variant,
  size,
  asChild = false,
  arrow = false,
  className,
  children,
  type = "button",
  ...props
}: PublicButtonProps & { variant: "primary" | "secondary" }) {
  const classes = cn(publicButtonVariants({ variant, size }), className);
  const icon = arrow ? (
    <ArrowRight
      aria-hidden="true"
      className="ease-soft size-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
      strokeWidth={1.75}
    />
  ) : null;

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        <Slottable>{children}</Slottable>
        {icon}
      </Slot>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
      {icon}
    </button>
  );
}

export function PrimaryButton(props: PublicButtonProps) {
  return <PublicButton variant="primary" {...props} />;
}

export function SecondaryButton(props: PublicButtonProps) {
  return <PublicButton variant="secondary" {...props} />;
}

export type ArrowLinkProps = PageLinkProps;

/** Inline "read more" link: "Zobacz całą ofertę →". */
export function ArrowLink({ className, children, ...props }: ArrowLinkProps) {
  return (
    <Link
      className={cn(
        "group/link font-body text-small text-ink decoration-border-strong/60 hover:decoration-primary focus-visible:outline-ring inline-flex items-center gap-1.5 rounded-sm font-semibold underline decoration-1 underline-offset-[6px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4",
        className,
      )}
      {...props}
    >
      {children}
      <ArrowRight
        aria-hidden="true"
        className="ease-soft size-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5"
        strokeWidth={1.75}
      />
    </Link>
  );
}
