import { db } from "@/lib/drizzle";
import { documents, profiles } from "@/lib/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import type { DocumentItem } from "../types";

export async function getDocuments(): Promise<DocumentItem[]> {
  const rows = await db
    .select({
      id: documents.id,
      name: documents.name,
      description: documents.description,
      fileUrl: documents.fileUrl,
      filePath: documents.filePath,
      fileSize: documents.fileSize,
      mimeType: documents.mimeType,
      uploadedByName: profiles.fullName,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(profiles, eq(documents.uploadedById, profiles.id))
    .orderBy(desc(documents.createdAt));

  return rows as DocumentItem[];
}

export async function getDocumentById(id: string): Promise<DocumentItem | null> {
  const rows = await db
    .select({
      id: documents.id,
      name: documents.name,
      description: documents.description,
      fileUrl: documents.fileUrl,
      filePath: documents.filePath,
      fileSize: documents.fileSize,
      mimeType: documents.mimeType,
      uploadedByName: profiles.fullName,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(profiles, eq(documents.uploadedById, profiles.id))
    .where(eq(documents.id, id))
    .limit(1);

  return (rows[0] as DocumentItem) ?? null;
}

export async function deleteDocument(id: string) {
  const [doc] = await db
    .delete(documents)
    .where(eq(documents.id, id))
    .returning({ filePath: documents.filePath });
  return doc;
}
