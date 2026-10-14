"use server";

import { db } from "@/lib/drizzle";
import { profiles } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerUser } from "@/lib/auth/helpers";
import { personNameField, phoneField } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { detectMime, MIME_EXTENSION } from "@/lib/file-sniff";
import type { ActionResult } from "@/lib/action-result";

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "No autenticado." };

  const nameResult = personNameField("El nombre").safeParse((formData.get("fullName") as string) ?? "");
  if (!nameResult.success) return { error: nameResult.error.issues[0].message };
  const fullName = nameResult.data;

  const phoneResult = phoneField().safeParse((formData.get("phone") as string) || undefined);
  if (!phoneResult.success) return { error: phoneResult.error.issues[0].message };
  const phone = phoneResult.data ?? null;

  const avatarFile = formData.get("avatar") as File | null;

  let avatarUrl: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 2 * 1024 * 1024) {
      return { error: "La imagen no puede superar 2 MB." };
    }
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    // El tipo real sale del contenido (SCRUM-302): un HTML renombrado .png se rechaza.
    const detected = detectMime(new Uint8Array(buffer));
    if (detected !== "image/png" && detected !== "image/jpeg" && detected !== "image/webp") {
      return { error: "Solo se permiten imágenes JPG, PNG o WebP." };
    }
    // Nombre nuevo en cada subida: la URL cambia (cache-busting) y se borra el avatar anterior.
    const path = `${user.id}/avatar-${Date.now()}.${MIME_EXTENSION[detected]}`;

    const service = createServiceClient();
    const { error: uploadError } = await service.storage
      .from("avatars")
      .upload(path, buffer, { upsert: false, contentType: detected });

    if (uploadError) return { error: "Error al subir la imagen. Verificá que el bucket 'avatars' exista en Supabase Storage." };

    const { data: previous } = await service.storage.from("avatars").list(user.id);
    const stale = (previous ?? []).map((f) => `${user.id}/${f.name}`).filter((p) => p !== path);
    if (stale.length > 0) await service.storage.from("avatars").remove(stale);

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
