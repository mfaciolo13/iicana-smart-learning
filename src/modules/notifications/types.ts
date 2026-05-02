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
