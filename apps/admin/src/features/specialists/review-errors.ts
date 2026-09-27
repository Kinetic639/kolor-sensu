/** A readable reason a review RPC failed (see the specialist domain migration). */
export function reviewErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error ? error.code : null;
  if (code === "42501") return "Brak uprawnień administratora.";
  if (code === "P0002") {
    return "Ten szkic nie czeka już na weryfikację. Odśwież stronę, aby zobaczyć aktualny stan.";
  }
  return "Nie udało się zakończyć weryfikacji. Spróbuj ponownie.";
}
