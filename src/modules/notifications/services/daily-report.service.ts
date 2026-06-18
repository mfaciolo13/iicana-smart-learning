import { db } from "@/lib/drizzle";
import { payments, students, profiles, attendance, enrollments, courses } from "@/lib/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export interface DailyReportData {
  date: string;
  paymentsSummary: { method: string; count: number; total: number }[];
  paymentsTotal: number;
  lowAttendanceStudents: { studentName: string; courseName: string; attendancePct: number }[];
  newStudents: { fullName: string; courseName: string }[];
  directorEmails: string[];
}

export async function getDailyReportData(): Promise<DailyReportData> {
  // "Yesterday" in UTC (cron runs at 10:00 UTC = 07:00 ART)
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // 1. Payments registered yesterday
  const paymentRows = await db
    .select({ method: payments.method, amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.status, "paid"), sql`${payments.paidAt}::date = ${yesterdayStr}`));

  const methodMap = new Map<string, { count: number; total: number }>();
  for (const p of paymentRows) {
    const key = p.method ?? "sin_metodo";
    const cur = methodMap.get(key) ?? { count: 0, total: 0 };
    cur.count++;
    cur.total += Number(p.amount);
    methodMap.set(key, cur);
  }

  const METHOD_LABELS: Record<string, string> = {
    cash: "Efectivo",
    transfer: "Transferencia",
    card: "Tarjeta",
    sin_metodo: "Sin método",
  };

  const paymentsSummary = [...methodMap.entries()].map(([method, data]) => ({
    method: METHOD_LABELS[method] ?? method,
    count: data.count,
    total: data.total,
  }));

  const paymentsTotal = paymentRows.reduce((sum, p) => sum + Number(p.amount), 0);

  // 2. Low-attendance students — fetch raw records, compute in JS to avoid CTE issues
  const attRows = await db
    .select({
      enrollmentId: attendance.enrollmentId,
      status: attendance.status,
      studentName: profiles.fullName,
      courseName: courses.name,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.status, "active"));

  const statsMap = new Map<string, { studentName: string; courseName: string; total: number; present: number }>();
  for (const r of attRows) {
    const cur = statsMap.get(r.enrollmentId) ?? { studentName: r.studentName, courseName: r.courseName, total: 0, present: 0 };
    cur.total++;
    if (r.status === "present" || r.status === "late") cur.present++;
    statsMap.set(r.enrollmentId, cur);
  }

  const lowAttendanceStudents = [...statsMap.values()]
    .filter((r) => r.total > 0 && Math.round((r.present / r.total) * 100) < 70)
    .map((r) => ({
      studentName: r.studentName,
      courseName: r.courseName,
      attendancePct: Math.round((r.present / r.total) * 100),
    }));

  // 3. New enrollments yesterday
  const newStudentRows = await db
    .select({ fullName: profiles.fullName, courseName: courses.name })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(sql`${enrollments.enrolledAt}::date = ${yesterdayStr}`);

  // 4. Director emails
  const directorRows = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.role, "director"));

  return {
    date: yesterdayStr,
    paymentsSummary,
    paymentsTotal,
    lowAttendanceStudents,
    newStudents: newStudentRows,
    directorEmails: directorRows.map((r) => r.email),
  };
}
