export type NotificationType = "absence" | "payment" | "grade" | "general" | "alert";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
  recipientName: string;
}

export interface SentNotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: Date;
  batchId: string | null;
  batchLabel: string | null;
  recipientCount: number;
  recipientName: string | null;
}
