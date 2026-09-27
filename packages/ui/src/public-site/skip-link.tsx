/**
 * "Przejdź do treści": the first focusable element of every page, invisible
 * until a keyboard user tabs to it, then jumps past the navigation to
 * <main id="tresc">.
 */
export function SkipLink({
  href = "#tresc",
  label = "Przejdź do treści",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      className="bg-primary text-on-primary text-small focus-visible:outline-ring sr-only z-50 rounded-full px-5 py-2.5 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {label}
    </a>
  );
}
