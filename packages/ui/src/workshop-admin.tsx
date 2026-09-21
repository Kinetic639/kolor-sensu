import type { WorkshopModality, WorkshopStatus } from "@repo/contracts";
import { StatusBadge, type StatusTone } from "./portal-content";

const statusTone: Record<WorkshopStatus, StatusTone> = {
  draft: "neutral",
  published: "success",
  cancelled: "danger",
  completed: "info",
};

const statusLabel: Record<WorkshopStatus, string> = {
  draft: "Szkic",
  published: "Opublikowany",
  cancelled: "Odwołany",
  completed: "Zakończony",
};

export function WorkshopStatusBadge({ status }: { status: WorkshopStatus }) {
  return (
    <StatusBadge tone={statusTone[status]}>{statusLabel[status]}</StatusBadge>
  );
}

const modalityLabel: Record<WorkshopModality, string> = {
  in_person: "Stacjonarnie",
  online: "Online",
};

export function WorkshopModalityBadge({
  modality,
}: {
  modality: WorkshopModality;
}) {
  return <StatusBadge tone="info">{modalityLabel[modality]}</StatusBadge>;
}
