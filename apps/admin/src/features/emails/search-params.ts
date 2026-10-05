import {
  createLoader,
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

// CMS → E-maile: the e-mail shown and how (as it looks, or its plain
// text) live in the URL.

const emailParsers = {
  mail: parseAsString,
  widok: parseAsStringLiteral(["wyglad", "tekst"] as const).withDefault(
    "wyglad",
  ),
};

export const loadEmailParams = createLoader(emailParsers);

const serialize = createSerializer(emailParsers, { clearOnDefault: true });

export function emailHref(values: {
  mail?: string | null;
  widok?: "wyglad" | "tekst";
}) {
  return serialize("/maile", values);
}
