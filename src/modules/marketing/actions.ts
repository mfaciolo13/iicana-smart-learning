"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/helpers";
import { personNameField, phoneField } from "@/lib/validation";
import { createCampaign, createInquiry, updateInquiryStatus } from "./services/marketing.service";
import type { ActionResult } from "@/lib/action-result";
import { refreshAnalytics } from "@/lib/analytics-cache";

const campaignSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  channel: z.enum(["social_media", "email", "flyers", "word_of_mouth", "website", "other"]),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().optional(),
  budget: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "El presupuesto debe ser un número válido")
    .optional(),
  description: z.string().optional(),
}).refine((v) => !v.endDate || v.endDate >= v.startDate, {
  message: "La fecha de fin no puede ser anterior a la de inicio",
  path: ["endDate"],
});

const inquiryStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "enrolled", "lost"]),
  campaignId: z.uuid(),
});

const inquirySchema = z.object({
  campaignId: z.uuid(),
  name: personNameField("El nombre"),
  email: z.email().optional().or(z.literal("")),
  phone: phoneField(),
  notes: z.string().optional(),
  receivedAt: z.string().min(1, "Fecha requerida"),
}).refine((v) => !!(v.email?.trim() || v.phone?.trim()), {
  message: "Ingresá al menos un email o un teléfono de contacto",
  path: ["email"],
});

export async function createCampaignAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const raw = {
    name: formData.get("name") as string,
    channel: formData.get("channel") as string,
    startDate: formData.get("startDate") as string,
    endDate: (formData.get("endDate") as string) || undefined,
    budget: (formData.get("budget") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
  };

  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat)
          .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          .filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  await createCampaign(parsed.data);

  refreshAnalytics();
  revalidatePath("/director/marketing");
  return { success: "Campaña creada correctamente", redirectTo: "/director/marketing" };
}

export async function createInquiryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const raw = {
    campaignId: formData.get("campaignId") as string,
    name: formData.get("name") as string,
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    receivedAt: formData.get("receivedAt") as string,
  };

  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat)
          .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          .filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  await createInquiry({ ...parsed.data, email: parsed.data.email || undefined });

  refreshAnalytics();
  revalidatePath(`/director/marketing/${raw.campaignId}`);
  return { success: "Consulta registrada" };
}

export async function updateInquiryStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const parsed = inquiryStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    campaignId: formData.get("campaignId"),
  });
  if (!parsed.success) return { error: "Datos inválidos" };
  const { id, status, campaignId } = parsed.data;

  await updateInquiryStatus(id, status);

  refreshAnalytics();
  revalidatePath(`/director/marketing/${campaignId}`);
  return { success: "Estado actualizado" };
}
