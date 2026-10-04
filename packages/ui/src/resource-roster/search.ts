// A roster's search: every word of the query somewhere in the text, in
// any case and without Polish letters (`klobuch` finds `Kłobuchowska`).

/** Lower case, without Polish letters. */
export function plainText(text: string) {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** A filter for the rows whose text has every word of the query. */
export function matchesSearch(query: string | null) {
  const words = query ? plainText(query).split(/\s+/).filter(Boolean) : [];
  return (text: string) => {
    if (!words.length) return true;
    const plain = plainText(text);
    return words.every((word) => plain.includes(word));
  };
}
