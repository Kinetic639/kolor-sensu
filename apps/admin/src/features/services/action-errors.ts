// What a failed save of a service tells the admin: in Polish, and on the
// field it is about when there is one (a taken address, under "Adres na
// stronie").

export type ServiceFailure = {
  ok: false;
  message: string;
  field?: "slug";
};

function has(error: unknown, key: string, value: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    key in error &&
    (error as Record<string, unknown>)[key] === value
  );
}

export function serviceFailure(error: unknown): ServiceFailure {
  // The catalogue's addresses are unique (services_slug_key).
  if (has(error, "code", "23505")) {
    return {
      ok: false,
      message: "Usługa z takim adresem już istnieje.",
      field: "slug",
    };
  }
  if (has(error, "name", "ZodError")) {
    return { ok: false, message: "Sprawdź poprawność danych formularza." };
  }
  return {
    ok: false,
    message: "Nie udało się zapisać usługi. Spróbuj ponownie.",
  };
}
