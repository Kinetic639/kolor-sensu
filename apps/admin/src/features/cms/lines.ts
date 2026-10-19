// A textarea of one item per line ("Co u nas znajdziesz", the facts under
// Profesjonalizm) and the list the CMS keeps.

export function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLines(list: readonly string[]): string {
  return list.join("\n");
}
