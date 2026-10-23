// A short list edited in the browser before it is saved as a draft ("Dlaczego
// my"'s facts, the crisis lines): add, remove, move, within the CMS's
// limits. Pure, so the forms stay thin; a change the limits refuse returns
// the list as it was.

export function addItem<Item>(
  list: readonly Item[],
  empty: Item,
  max: number,
): readonly Item[] {
  return list.length >= max ? list : [...list, empty];
}

export function removeItem<Item>(
  list: readonly Item[],
  index: number,
  min: number,
): readonly Item[] {
  return list.length <= min ? list : list.filter((_, at) => at !== index);
}

export function moveItem<Item>(
  list: readonly Item[],
  index: number,
  by: -1 | 1,
): readonly Item[] {
  const to = index + by;
  if (to < 0 || to >= list.length) return list;
  const moved = [...list];
  [moved[index], moved[to]] = [moved[to]!, moved[index]!];
  return moved;
}
