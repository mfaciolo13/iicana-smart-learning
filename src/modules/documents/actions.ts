"use server";

// NOTE: The "documents" bucket in Supabase Storage must be created manually
// in the Supabase dashboard as a public bucket before uploads will work.

import { revalidatePath } from "next/cache";
import { requireRole, getServerProfile } from "@/lib/auth/helpers";
import { db } from "@/lib/drizzle";
import { documents } from "@/lib/drizzle/schema";
import { createServiceClient } from "@/lib/supabase/service";
import { uploadDocumentSchema } from "./schemas";
import { deleteDocument } from "./services/documents.service";
import type { ActionResult } from "@/lib/action-result";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadDocumentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "profesor"]);
  const profile = await getServerProfile();
  if (!profile) return { error: "No autorizado" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Seleccioná un archivo" };
  if (file.size > MAX_SIZE) return { error: "El archivo no puede superar los 10 MB" };
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: "Formato no permitido. Usá PDF, Word, imágenes o texto plano." };
  }

  const raw = {
    name: (formData.get("name") as string) || file.name.replace(/\.[^.]+$/, ""),
    description: (formData.get("description") as string) || undefined,
  };

  const parsed = uploadDocumentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ext = file.name.split(".").pop() ?? "bin";
  const filePath = `documents/${profile.id}/${Date.now()}.${ext}`;

  const supabase = createServiceClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (storageError) return { error: `Error al subir el archivo: ${storageError.message}` };

  const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(filePath);

  await db.insert(documents).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    fileUrl: publicUrl,
    filePath,
    fileSize: file.size,
    mimeType: file.type,
    uploadedById: profile.id,
  });

  revalidatePath("/director/documents");
  revalidatePath("/profesor/documents");
  return { success: "Documento subido correctamente" };
}

export async function deleteDocumentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  const doc = await deleteDocument(id);
  if (!doc) return { error: "Documento no encontrado" };

  const supabase = createServiceClient();
  await supabase.storage.from("documents").remove([doc.filePath]);

  revalidatePath("/director/documents");
  revalidatePath("/profesor/documents");
  revalidatePath("/alumno/documents");
  return { success: "Documento eliminado" };
}
