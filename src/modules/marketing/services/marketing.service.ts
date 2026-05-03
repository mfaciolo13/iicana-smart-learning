import { db } from "@/lib/drizzle";
import { marketingCampaigns, inquiries } from "@/lib/drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

export const CHANNEL_LABELS: Record<string, string> = {
  social_media: "Redes sociales",
  email: "Email",
  flyers: "Folletos / Volantes",
  word_of_mouth: "Boca a boca",
  website: "Sitio web",
  other: "Otro",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  enrolled: "Inscripto",
  lost: "Perdido",
};

export interface CampaignListItem {
  id: string;
  name: string;
  channel: string;
  startDate: string;
  endDate: string | null;
  budget: string | null;
  totalInquiries: number;
  enrolledCount: number;
  conversionRate: number;
}

export interface InquiryItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  receivedAt: string;
}

export interface CampaignDetail extends CampaignListItem {
  description: string | null;
  inquiries: InquiryItem[];
}

export async function getCampaigns(): Promise<CampaignListItem[]> {
  const rows = await db
    .select({
      id: marketingCampaigns.id,
      name: marketingCampaigns.name,
      channel: marketingCampaigns.channel,
      startDate: marketingCampaigns.startDate,
      endDate: marketingCampaigns.endDate,
      budget: marketingCampaigns.budget,
      totalInquiries: sql<number>`cast(count(${inquiries.id}) as int)`,
      enrolledCount: sql<number>`cast(sum(case when ${inquiries.status} = 'enrolled' then 1 else 0 end) as int)`,
    })
    .from(marketingCampaigns)
    .leftJoin(inquiries, eq(inquiries.campaignId, marketingCampaigns.id))
    .groupBy(marketingCampaigns.id)
    .orderBy(desc(marketingCampaigns.startDate));

  return rows.map((r) => ({
    ...r,
    budget: r.budget ?? null,
    endDate: r.endDate ?? null,
    conversionRate:
      r.totalInquiries > 0 ? Math.round((r.enrolledCount / r.totalInquiries) * 100) : 0,
  }));
}

export async function getCampaignById(id: string): Promise<CampaignDetail | null> {
  const [campaign] = await db
    .select({
      id: marketingCampaigns.id,
      name: marketingCampaigns.name,
      channel: marketingCampaigns.channel,
      startDate: marketingCampaigns.startDate,
      endDate: marketingCampaigns.endDate,
      budget: marketingCampaigns.budget,
      description: marketingCampaigns.description,
    })
    .from(marketingCampaigns)
    .where(eq(marketingCampaigns.id, id))
    .limit(1);

  if (!campaign) return null;

  const inquiryRows = await db
    .select({
      id: inquiries.id,
      name: inquiries.name,
      email: inquiries.email,
      phone: inquiries.phone,
      status: inquiries.status,
      notes: inquiries.notes,
      receivedAt: inquiries.receivedAt,
    })
    .from(inquiries)
    .where(eq(inquiries.campaignId, id))
    .orderBy(desc(inquiries.receivedAt));

  const totalInquiries = inquiryRows.length;
  const enrolledCount = inquiryRows.filter((i) => i.status === "enrolled").length;

  return {
    ...campaign,
    budget: campaign.budget ?? null,
    endDate: campaign.endDate ?? null,
    totalInquiries,
    enrolledCount,
    conversionRate: totalInquiries > 0 ? Math.round((enrolledCount / totalInquiries) * 100) : 0,
    inquiries: inquiryRows.map((i) => ({ ...i, email: i.email ?? null, phone: i.phone ?? null, notes: i.notes ?? null })),
  };
}

export async function createCampaign(input: {
  name: string;
  channel: string;
  startDate: string;
  endDate?: string;
  budget?: string;
  description?: string;
}) {
  const [campaign] = await db
    .insert(marketingCampaigns)
    .values({
      name: input.name,
      channel: input.channel as typeof marketingCampaigns.$inferInsert["channel"],
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      budget: input.budget ?? null,
      description: input.description ?? null,
    })
    .returning();
  return campaign;
}

export async function createInquiry(input: {
  campaignId: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  receivedAt: string;
}) {
  const [inquiry] = await db
    .insert(inquiries)
    .values({
      campaignId: input.campaignId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      receivedAt: input.receivedAt,
      status: "pending",
    })
    .returning();
  return inquiry;
}

export async function updateInquiryStatus(id: string, status: "pending" | "enrolled" | "lost") {
  await db.update(inquiries).set({ status }).where(eq(inquiries.id, id));
}
