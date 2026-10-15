import { db } from "@/lib/drizzle";
import {
  students,
  profiles,
  enrollments,
  attendance,
  grades,
  payments,
  courses,
} from "@/lib/drizzle/schema";
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { todayInstitute } from "@/lib/validation";

export async function getAttendanceReport() {
  return db
    .select({
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(sum(case when ${attendance.status} = 'present' then 1 else 0 end) as int)`,
      absent: sql<number>`cast(sum(case when ${attendance.status} = 'absent' then 1 else 0 end) as int)`,
      late: sql<number>`cast(sum(case when ${attendance.status} = 'late' then 1 else 0 end) as int)`,
      pct: sql<number>`round(sum(case when ${attendance.status} in ('present','late') then 1 else 0 end) * 100.0 / count(*), 1)`,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .groupBy(profiles.fullName, students.dni, courses.name)
    .orderBy(profiles.fullName, courses.name);
}

export async function getGradesReport() {
  return db
    .select({
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      evaluationType: grades.evaluationType,
      score: grades.score,
      evaluatedAt: grades.evaluatedAt,
    })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .orderBy(profiles.fullName, courses.name, grades.evaluatedAt);
}

export async function getPaymentsReport() {
  return db
    .select({
      studentName: profiles.fullName,
      studentDni: students.dni,
      amount: payments.amount,
      dueDate: payments.dueDate,
      paidAt: payments.paidAt,
      method: payments.method,
      status: payments.status,
      receiptNumber: payments.receiptNumber,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .orderBy(profiles.fullName, payments.dueDate);
}

export async function getReportsSummary() {
  const [attendanceSummary] = await db
    .select({
      totalRecords: sql<number>`cast(count(*) as int)`,
      avgPct: sql<number>`round(avg(case when ${attendance.status} in ('present','late') then 100.0 else 0 end), 1)`,
    })
    .from(attendance);

  const [gradesSummary] = await db
    .select({
      totalGrades: sql<number>`cast(count(*) as int)`,
      avgScore: sql<number>`round(avg(${grades.score}::numeric), 2)`,
      passing: sql<number>`cast(sum(case when ${grades.score}::numeric >= 7 then 1 else 0 end) as int)`,
    })
    .from(grades);

  const [paymentsSummary] = await db
    .select({
      totalPaid: sql<number>`cast(sum(case when ${payments.status} = 'paid' then 1 else 0 end) as int)`,
      totalPending: sql<number>`cast(sum(case when ${payments.status} in ('pending','overdue') then 1 else 0 end) as int)`,
      amountCollected: sql<string>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amount} else 0 end), 0)::text`,
      amountPending: sql<string>`coalesce(sum(case when ${payments.status} in ('pending','overdue') then ${payments.amount} else 0 end), 0)::text`,
    })
    .from(payments);

  return { attendanceSummary, gradesSummary, paymentsSummary };
}

export interface DelinquentStudent {
  studentId: string;
  studentName: string;
  studentDni: string;
  email: string;
  phone: string | null;
  /** Cuotas vencidas o suspendidas sin cobrar. */
  overdueCount: number;
  amountOwed: number;
  oldestDueDate: string;
  /** Días de atraso de la cuota más vieja (hoy - vencimiento). */
  daysLate: number;
  accessRestricted: boolean;
}

/**
 * Alumnos con deuda vencida (SCRUM-285: sin cobrar y con vencimiento anterior a hoy, más las
 * cuotas suspendidas), de mayor a menor monto adeudado.
 */
export async function getDelinquencyReport(): Promise<DelinquentStudent[]> {
  const today = todayInstitute();
  const rows = await db
    .select({
      studentId: students.id,
      studentName: profiles.fullName,
      studentDni: students.dni,
      email: profiles.email,
      phone: profiles.phone,
      accessRestricted: students.accessRestricted,
      overdueCount: sql<number>`cast(count(*) as int)`,
      amountOwed: sql<string>`coalesce(sum(${payments.amount}), 0)::text`,
      oldestDueDate: sql<string>`min(${payments.dueDate})::text`,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(
      and(
        inArray(payments.status, ["pending", "overdue", "suspended"]),
        or(lt(payments.dueDate, today), eq(payments.status, "suspended"))
      )
    )
    .groupBy(students.id, profiles.fullName, students.dni, profiles.email, profiles.phone, students.accessRestricted)
    .orderBy(desc(sql`sum(${payments.amount})`), profiles.fullName);

  const todayMs = Date.parse(`${today}T12:00:00Z`);
  return rows.map((r) => ({
    ...r,
    amountOwed: Number(r.amountOwed),
    daysLate: Math.max(0, Math.round((todayMs - Date.parse(`${r.oldestDueDate}T12:00:00Z`)) / 86_400_000)),
  }));
}
