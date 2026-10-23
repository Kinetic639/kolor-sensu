/**
 * Loads one CMS tab's content; a failure is logged and gives null, so one
 * tab that cannot load (e.g. its row not migrated yet) does not take the
 * whole /cms page down with it. A warning, not an error: the page handles
 * it (the tab says so), and Next's dev overlay pops up on console.error.
 */
export async function settle<T>(
  what: string,
  load: () => Promise<T>,
): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    console.warn(`[cms] ${what} failed to load: ${describe(error)}`);
    return null;
  }
}

/** Database errors are plain objects ({ code, message, … }), not Errors. */
function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    return [code, message].filter(Boolean).join(" ") || JSON.stringify(error);
  }
  return String(error);
}
