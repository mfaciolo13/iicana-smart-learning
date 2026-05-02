export type ComplaintType = "academic" | "administrative" | "infrastructure" | "teacher";
export type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed";

export interface ComplaintItem {
  id: string;
  userId: string;
  type: ComplaintType;
  description: string;
  status: ComplaintStatus;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorName: string;
  authorRole: string;
}
