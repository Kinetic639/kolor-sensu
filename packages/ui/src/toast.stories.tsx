import type { Meta, StoryObj } from "@storybook/react";
import { CalendarX, Hourglass, Video } from "lucide-react";
import { useEffect } from "react";
import { expect, fn, within } from "storybook/test";
import { toast, type ToastOptions, type ToastTone } from "./toast";
import { AppToaster } from "./toaster";

// The portals' toasts: a short card at the top, in the middle; what
// happened, a line of detail, an action, the close button and a bar
// showing how long it stays (stopped while the pointer is on it).

const open = fn();

const SAMPLES: Record<
  string,
  { tone: ToastTone; title: string } & ToastOptions
> = {
  success: {
    tone: "success",
    title: "Zapisano dane klienta",
    description: "Zmieniono też 2 nadchodzące wizyty.",
  },
  error: {
    tone: "error",
    title: "Nie udało się zapisać",
    description: "Inny klient ma już ten adres e-mail.",
  },
  warning: {
    tone: "warning",
    title: "Odwołano wizytę, ale zwrot się nie udał",
    description: "Zleć go w Stripe.",
  },
  live: {
    tone: "error",
    title: "Rezerwacja anulowana",
    icon: <CalendarX aria-hidden="true" />,
    description: "Marta Wiśniewska · czw. 15.10, 13:00 · 2610-024",
    action: { label: "Otwórz", onClick: open },
  },
  reserved: {
    tone: "info",
    title: "Nowa rezerwacja",
    meta: (
      <span className="flex items-center gap-0.5 text-[var(--text-muted)] [&_svg]:size-3">
        <Hourglass
          aria-label="Płatność później"
          className="text-[var(--warning)]"
        />
        <Video aria-label="Wizyta online" className="text-[var(--info)]" />
      </span>
    ),
    description: "Michał Stępień · pt. 09.10, 10:00 · 2610-027",
    action: { label: "Otwórz", onClick: open },
  },
};

function Toasts({ show }: { show: (keyof typeof SAMPLES)[] }) {
  useEffect(() => {
    toast.dismiss();
    for (const key of show) {
      const { tone, title, ...options } = SAMPLES[key]!;
      // Long enough to look at.
      toast[tone](title, { ...options, duration: 600_000 });
    }
    return () => toast.dismiss();
  }, [show]);
  return (
    <div className="min-h-[22rem] bg-[var(--surface-muted)]">
      <AppToaster />
    </div>
  );
}

const meta = {
  title: "Portal/Toast",
  component: Toasts,
  parameters: { layout: "fullscreen", controls: { disable: true } },
} satisfies Meta<typeof Toasts>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Saved, refused, partly done: each in its tone. */
export const Tones: Story = {
  args: { show: ["success", "error", "warning"] },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await expect(await page.findByRole("alert")).toHaveTextContent(
      "Nie udało się zapisać",
    );
    await expect((await page.findAllByRole("status"))[0]).toBeVisible();
  },
};

/** A live notification: what happened, whose visit, and a way to it. */
export const LiveNotification: Story = {
  args: { show: ["reserved", "live"] },
  play: async ({ canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    const shown = await page.findByRole("alert");
    await userEvent.click(
      within(shown).getByRole("button", { name: "Otwórz" }),
    );
    await expect(open).toHaveBeenCalled();
  },
};

export const Mobile: Story = {
  args: { show: ["live", "success"] },
  globals: { viewport: { value: "mobile", isRotated: false } },
};
