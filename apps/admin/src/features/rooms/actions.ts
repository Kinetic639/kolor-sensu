"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import {
  getRoomPublicProfileAdmin,
  upsertRoomPublicProfile,
} from "@repo/supabase";
import { revalidatePath } from "next/cache";
import {
  roomProfileFormSchema,
  toRoomProfileInput,
  type RoomProfileFormValues,
} from "./forms";

type ActionResult = { ok: true } | { ok: false; message: string };

export async function saveRoomProfileAction(
  roomId: string,
  values: RoomProfileFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = roomProfileFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Sprawdź dane profilu." };
  try {
    const client = await createClient();
    const current = await getRoomPublicProfileAdmin(client, roomId);
    await upsertRoomPublicProfile(
      client,
      roomId,
      toRoomProfileInput(parsed.data, current),
    );
    revalidatePath("/gabinety");
    await revalidateWeb([{ path: "/gabinety" }]);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Nie udało się zapisać profilu gabinetu. Spróbuj ponownie.",
    };
  }
}
