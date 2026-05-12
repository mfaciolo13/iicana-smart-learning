import { db } from "@/lib/drizzle";
import { notifications, profiles, enrollments, students, courses } from "@/lib/drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { NotificationItem, NotificationType } from "../types";

interface NotifPayload {
  type: NotificationType;
  title: string;
  body: string;
}

export async function getMyNotifications(userId: string): Promise<NotificationItem[]> {
  const rows = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      read: notifications.read,
      createdAt: notifications.createdAt,
      recipientName: profiles.fullName,
    })
    .from(notifications)
    .innerJoin(profiles, eq(notifications.userId, profiles.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));

  return rows as NotificationItem[];
}

export async function getAllNotifications(): Promise<NotificationItem[]> {
  const rows = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      read: notifications.read,
      createdAt: notifications.createdAt,
      recipientName: profiles.fullName,
    })
    .from(notifications)
    .innerJoin(profiles, eq(notifications.userId, profiles.id))
    .orderBy(desc(notifications.createdAt))
    .limit(200);

  return rows as NotificationItem[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

  return row?.count ?? 0;
}

export async function markAsRead(id: string, userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

// Insert one notification for a specific user profile
async function insertOne(userId: string, payload: NotifPayload) {
  await db.insert(notifications).values({
    userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
  });
}

export async function sendToUser(userId: string, payload: NotifPayload) {
  await insertOne(userId, payload);
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Directivos",
  profesor: "Profesores",
  alumno: "Alumnos",
  tutor: "Tutores",
};

export async function sendToRole(role: string, payload: NotifPayload) {
  const recipients = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.role, role as never));

  if (recipients.length === 0) return;

  const batchId = crypto.randomUUID();
  const batchLabel = `Rol: ${ROLE_LABELS[role] ?? role}`;

  await db.insert(notifications).values(
    recipients.map((r) => ({
      userId: r.id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      batchId,
      batchLabel,
    }))
  );
}

export async function getEmailsForRole(role: string): Promise<{ email: string; fullName: string }[]> {
  return db
    .select({ email: profiles.email, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.role, role as never));
}

export async function getEmailsForCourse(courseId: string): Promise<{ email: string; fullName: string }[]> {
  return db
    .select({ email: profiles.email, fullName: profiles.fullName })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "active")));
}

export async function getEmailForUser(userId: string): Promise<{ email: string; fullName: string } | null> {
  const [row] = await db
    .select({ email: profiles.email, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row ?? null;
}

export async function sendToCourse(courseId: string, payload: NotifPayload) {
  const [enrollmentRows, courseRows] = await Promise.all([
    db
      .select({ profileId: students.profileId })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "active"))),
    db.select({ name: courses.name }).from(courses).where(eq(courses.id, courseId)).limit(1),
  ]);

  if (enrollmentRows.length === 0) return;

  const batchId = crypto.randomUUID();
  const batchLabel = `Curso: ${courseRows[0]?.name ?? courseId}`;

  await db.insert(notifications).values(
    enrollmentRows.map((r) => ({
      userId: r.profileId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      batchId,
      batchLabel,
    }))
  );
}
