"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/helpers";
import { createCampaign, createInquiry, updateInquiryStatus } from "./services/marketing.service";
import type { ActionResult } from "@/lib/action-result";

const campaignSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  channel: z.enum(["social_media", "email", "flyers", "word_of_mouth", "website", "other"]),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  description: z.string().optional(),
});

const inquirySchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(2, "Nombre requerido"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  receivedAt: z.string().min(1, "Fecha requerida"),
});

export async function createCampaignAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    name: formData.get("name") as string,
    channel: formData.get("channel") as string,
    startDate: formData.get("startDate") as string,
    endDate: (formData.get("endDate") as string) || undefined,
    budget: (formData.get("budget") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
  };

  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const campaign = await createCampaign(parsed.data);

  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${campaign.id}`);
}

export async function createInquiryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    campaignId: formData.get("campaignId") as string,
    name: formData.get("name") as string,
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    receivedAt: formData.get("receivedAt") as string,
  };

  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await createInquiry({ ...parsed.data, email: parsed.data.email || undefined });

  revalidatePath(`/admin/marketing/${raw.campaignId}`);
  return { success: "Consulta registrada" };
}

export async function updateInquiryStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  const status = formData.get("status") as "pending" | "enrolled" | "lost";
  const campaignId = formData.get("campaignId") as string;

  if (!id || !status) return { error: "Datos incompletos" };

  await updateInquiryStatus(id, status);

  revalidatePath(`/admin/marketing/${campaignId}`);
  return { success: "Estado actualizado" };
}
