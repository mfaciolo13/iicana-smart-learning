import { db } from "@/lib/drizzle";
import { complaints, profiles } from "@/lib/drizzle/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";
import type { ComplaintItem, ComplaintType, ComplaintStatus } from "../types";
import type { CreateComplaintInput } from "../schemas";

export async function getAllComplaints(): Promise<ComplaintItem[]> {
  const rows = await db
    .select({
      id: complaints.id,
      userId: complaints.userId,
      type: complaints.type,
      description: complaints.description,
      status: complaints.status,
      resolvedAt: complaints.resolvedAt,
      createdAt: complaints.createdAt,
      updatedAt: complaints.updatedAt,
      authorName: profiles.fullName,
      authorRole: profiles.role,
    })
    .from(complaints)
    .innerJoin(profiles, eq(complaints.userId, profiles.id))
    .orderBy(desc(complaints.createdAt));

  return rows as ComplaintItem[];
}

export async function getMyComplaints(userId: string): Promise<ComplaintItem[]> {
  const rows = await db
    .select({
      id: complaints.id,
      userId: complaints.userId,
      type: complaints.type,
      description: complaints.description,
      status: complaints.status,
      resolvedAt: complaints.resolvedAt,
      createdAt: complaints.createdAt,
      updatedAt: complaints.updatedAt,
      authorName: profiles.fullName,
      authorRole: profiles.role,
    })
    .from(complaints)
    .innerJoin(profiles, eq(complaints.userId, profiles.id))
    .where(eq(complaints.userId, userId))
    .orderBy(desc(complaints.createdAt));

  return rows as ComplaintItem[];
}

export async function getComplaintById(id: string): Promise<ComplaintItem | null> {
  const rows = await db
    .select({
      id: complaints.id,
      userId: complaints.userId,
      type: complaints.type,
      description: complaints.description,
      status: complaints.status,
      resolvedAt: complaints.resolvedAt,
      createdAt: complaints.createdAt,
      updatedAt: complaints.updatedAt,
      authorName: profiles.fullName,
      authorRole: profiles.role,
    })
    .from(complaints)
    .innerJoin(profiles, eq(complaints.userId, profiles.id))
    .where(eq(complaints.id, id))
    .limit(1);

  return (rows[0] as ComplaintItem) ?? null;
}

export async function createComplaint(userId: string, input: CreateComplaintInput) {
  const [complaint] = await db
    .insert(complaints)
    .values({
      userId,
      type: input.type as ComplaintType,
      description: input.description,
      status: "open",
    })
    .returning();
  return complaint;
}

export async function updateComplaintStatus(id: string, status: ComplaintStatus) {
  const [current] = await db.select({ resolvedAt: complaints.resolvedAt }).from(complaints).where(eq(complaints.id, id)).limit(1);
  const closing = status === "resolved" || status === "closed";
  const [updated] = await db
    .update(complaints)
    .set({
      status,
      // Pasar de "resuelto" a "cerrado" conserva la fecha en que se resolvió (antes se pisaba con la de cierre).
      resolvedAt: closing ? (current?.resolvedAt ?? new Date()) : null,
      updatedAt: new Date(),
    })
    .where(eq(complaints.id, id))
    .returning();
  return updated;
}

/** Reclamos abiertos o en proceso (para el contador de los dashboards del personal). */
export async function countOpenComplaints(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(complaints)
    .where(inArray(complaints.status, ["open", "in_progress"]));
  return row?.n ?? 0;
}
