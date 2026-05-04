"use server";

import { db } from "@/lib/drizzle";
import { profiles } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerUser } from "@/lib/auth/helpers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/action-result";

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "No autenticado." };

  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const avatarFile = formData.get("avatar") as File | null;

  if (!fullName) return { error: "El nombre es requerido." };

  let avatarUrl: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 2 * 1024 * 1024) {
      return { error: "La imagen no puede superar 2 MB." };
    }
    const ext = avatarFile.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext ?? "")) {
      return { error: "Solo se permiten imágenes JPG, PNG o WebP." };
    }
    const path = `${user.id}/avatar.${ext}`;
    const bytes = await avatarFile.arrayBuffer();

    const service = createServiceClient();
    const { error: uploadError } = await service.storage
      .from("avatars")
      .upload(path, bytes, { upsert: true, contentType: avatarFile.type });

    if (uploadError) return { error: "Error al subir la imagen. Verificá que el bucket 'avatars' exista en Supabase Storage." };

    const { data: { publicUrl } } = service.storage.from("avatars").getPublicUrl(path);
    avatarUrl = publicUrl;
  }

  await db
    .update(profiles)
    .set({
      fullName,
      phone,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id));

  revalidatePath("/", "layout");
  return { success: "Cambios guardados correctamente." };
}
