/**
 * Loads one CMS tab's content; a failure is logged and gives null, so one
 * tab that cannot load (e.g. its row not migrated yet) does not take the
 * whole /cms page down with it.
 */
export async function settle<T>(
  what: string,
  load: () => Promise<T>,
): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    console.error(`[cms] ${what} failed to load:`, error);
    return null;
  }
}
