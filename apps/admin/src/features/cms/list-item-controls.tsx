"use client";

import { DETAIL_ICON_BUTTON } from "@repo/ui/detail-page";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

// Move up, move down and remove, for one item of a short CMS list (a fact,
// a crisis line). Each button names the item it acts on.

export function ListItemControls({
  name,
  canMoveUp,
  canMoveDown,
  canRemove,
  onMove,
  onRemove,
}: {
  name: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        aria-label={`Przesuń „${name}” wyżej`}
        className={DETAIL_ICON_BUTTON}
        disabled={!canMoveUp}
        onClick={() => onMove(-1)}
        type="button"
      >
        <ArrowUp />
      </button>
      <button
        aria-label={`Przesuń „${name}” niżej`}
        className={DETAIL_ICON_BUTTON}
        disabled={!canMoveDown}
        onClick={() => onMove(1)}
        type="button"
      >
        <ArrowDown />
      </button>
      <button
        aria-label={`Usuń „${name}”`}
        className={DETAIL_ICON_BUTTON}
        disabled={!canRemove}
        onClick={onRemove}
        type="button"
      >
        <Trash2 />
      </button>
    </div>
  );
}
