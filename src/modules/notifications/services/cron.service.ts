import { db } from "@/lib/drizzle";
import {
  courses,
  enrollments,
  students,
  profiles,
  payments,
  notificationSettings,
  userNotificationPreferences,
} from "@/lib/drizzle/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

const DAY_MAP = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export interface ClassReminderRecipient {
  email: string;
  fullName: string;
  courseName: string;
  classDate: string;
  classTime: string;
}

export async function getClassReminderRecipients(): Promise<ClassReminderRecipient[]> {
  const setting = await db
    .select({ enabled: notificationSettings.enabled })
    .from(notificationSettings)
    .where(eq(notificationSettings.alertType, "class_reminder"))
    .limit(1);

  if (!setting[0]?.enabled) return [];

  // Cron runs at 23:00 UTC = 20:00 ART — "tomorrow" in ART is +1 day in UTC
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowDay = DAY_MAP[tomorrow.getUTCDay()];
  const classDate = tomorrow.toISOString().slice(0, 10);

  const activeCourses = await db
    .select({ id: courses.id, name: courses.name, classTime: courses.classTime, classDays: courses.classDays })
    .from(courses)
    .where(eq(courses.status, "active"));

  const tomorrowCourses = activeCourses.filter((c) => (c.classDays as string[]).includes(tomorrowDay));
  if (tomorrowCourses.length === 0) return [];

  const tomorrowCourseIds = tomorrowCourses.map((c) => c.id);
  const courseMap = new Map(tomorrowCourses.map((c) => [c.id, { name: c.name, classTime: c.classTime }]));

  const rows = await db
    .select({
      email: profiles.email,
      fullName: profiles.fullName,
      userId: profiles.id,
      courseId: enrollments.courseId,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .innerJoin(profiles, eq(profiles.id, students.profileId))
    .where(
      and(
        eq(enrollments.status, "active"),
        eq(students.status, "active"),
        inArray(enrollments.courseId, tomorrowCourseIds)
      )
    );

  if (rows.length === 0) return [];

  const optOuts = await db
    .select({ userId: userNotificationPreferences.userId })
    .from(userNotificationPreferences)
    .where(
      and(
        eq(userNotificationPreferences.alertType, "class_reminder"),
        eq(userNotificationPreferences.enabled, false)
      )
    );

  const optOutSet = new Set(optOuts.map((o) => o.userId));

  return rows
    .filter((r) => !optOutSet.has(r.userId))
    .map((r) => {
      const course = courseMap.get(r.courseId)!;
      return {
        email: r.email,
        fullName: r.fullName,
        courseName: course.name,
        classDate,
        classTime: course.classTime.slice(0, 5),
      };
    });
}

export interface PaymentReminderRecipient {
  email: string;
  fullName: string;
  courseName: string;
  dueDate: string;
  amount: number;
}

export async function getPaymentReminderRecipients(): Promise<PaymentReminderRecipient[]> {
  const setting = await db
    .select({ enabled: notificationSettings.enabled })
    .from(notificationSettings)
    .where(eq(notificationSettings.alertType, "payment_reminder"))
    .limit(1);

  if (!setting[0]?.enabled) return [];

  // Cron runs at 12:00 UTC = 09:00 ART — warn about payments due in 3 days
  const threeDaysLater = new Date();
  threeDaysLater.setUTCDate(threeDaysLater.getUTCDate() + 3);
  const dueDateStr = threeDaysLater.toISOString().slice(0, 10);

  const rows = await db
    .select({
      email: profiles.email,
      fullName: profiles.fullName,
      userId: profiles.id,
      amount: payments.amount,
      dueDate: payments.dueDate,
    })
    .from(payments)
    .innerJoin(students, eq(students.id, payments.studentId))
    .innerJoin(profiles, eq(profiles.id, students.profileId))
    .where(and(eq(payments.status, "pending"), eq(payments.dueDate, dueDateStr)));

  if (rows.length === 0) return [];

  // Get active course for each student (for the email body)
  const studentProfileIds = rows.map((r) => r.userId);

  const courseRows = await db
    .select({ profileId: profiles.id, courseName: courses.name })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .innerJoin(profiles, eq(profiles.id, students.profileId))
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(
      and(
        eq(enrollments.status, "active"),
        eq(courses.status, "active"),
        inArray(profiles.id, studentProfileIds)
      )
    );

  const courseByProfile = new Map(courseRows.map((r) => [r.profileId, r.courseName]));

  const optOuts = await db
    .select({ userId: userNotificationPreferences.userId })
    .from(userNotificationPreferences)
    .where(
      and(
        eq(userNotificationPreferences.alertType, "payment_reminder"),
        eq(userNotificationPreferences.enabled, false)
      )
    );

  const optOutSet = new Set(optOuts.map((o) => o.userId));

  return rows
    .filter((r) => !optOutSet.has(r.userId))
    .map((r) => ({
      email: r.email,
      fullName: r.fullName,
      courseName: courseByProfile.get(r.userId) ?? "Smart Learning",
      dueDate: r.dueDate,
      amount: Number(r.amount),
    }));
}

export interface OverdueAlertRecipient {
  paymentId: string;
  email: string;
  fullName: string;
  courseName: string;
  dueDate: string;
  amount: number;
}

export async function getOverdueAlertRecipients(): Promise<OverdueAlertRecipient[]> {
  const rows = await db
    .select({
      paymentId: payments.id,
      profileId: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      amount: payments.amount,
      dueDate: payments.dueDate,
    })
    .from(payments)
    .innerJoin(students, eq(students.id, payments.studentId))
    .innerJoin(profiles, eq(profiles.id, students.profileId))
    .where(and(eq(payments.status, "overdue"), isNull(payments.overdueAlertSentAt)));

  if (rows.length === 0) return [];

  const profileIds = rows.map((r) => r.profileId);
  const courseRows = await db
    .select({ profileId: profiles.id, courseName: courses.name })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .innerJoin(profiles, eq(profiles.id, students.profileId))
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(
      and(
        eq(enrollments.status, "active"),
        eq(courses.status, "active"),
        inArray(profiles.id, profileIds)
      )
    );

  const courseByProfileId = new Map(courseRows.map((r) => [r.profileId, r.courseName]));

  return rows.map((r) => ({
    paymentId: r.paymentId,
    email: r.email,
    fullName: r.fullName,
    courseName: courseByProfileId.get(r.profileId) ?? "Smart Learning",
    dueDate: r.dueDate,
    amount: Number(r.amount),
  }));
}
