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

  // Payments registered yesterday
  const paymentRows = await db
    .select({
      method: payments.method,
      amount: payments.amount,
    })
    .from(payments)
    .where(
      and(
        eq(payments.status, "paid"),
        sql`${payments.paidAt}::date = ${yesterdayStr}`
      )
    );

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

  // Students with attendance < 70% (using attendance + enrollments)
  const attStats = db
    .$with("att_stats")
    .as(
      db
        .select({
          enrollmentId: attendance.enrollmentId,
          total: sql<number>`cast(count(*) as int)`,
          present: sql<number>`cast(sum(case when ${attendance.status} in ('present','late') then 1 else 0 end) as int)`,
        })
        .from(attendance)
        .groupBy(attendance.enrollmentId)
    );

  const lowAttRows = await db
    .with(attStats)
    .select({
      studentName: profiles.fullName,
      courseName: courses.name,
      total: attStats.total,
      present: attStats.present,
    })
    .from(enrollments)
    .innerJoin(attStats, eq(attStats.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.status, "active"));

  const lowAttendanceStudents = lowAttRows
    .filter((r) => r.total > 0 && Math.round((r.present / r.total) * 100) < 70)
    .map((r) => ({
      studentName: r.studentName,
      courseName: r.courseName,
      attendancePct: Math.round((r.present / r.total) * 100),
    }));

  // New students enrolled yesterday
  const newStudentRows = await db
    .select({ fullName: profiles.fullName, courseName: courses.name })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(sql`${enrollments.enrolledAt}::date = ${yesterdayStr}`);

  const newStudents = newStudentRows;

  // Get all director emails
  const directorRows = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.role, "director"));

  const directorEmails = directorRows.map((r) => r.email);

  return {
    date: yesterdayStr,
    paymentsSummary,
    paymentsTotal,
    lowAttendanceStudents,
    newStudents,
    directorEmails,
  };
}
