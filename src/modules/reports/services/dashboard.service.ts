import { db } from "@/lib/drizzle";
import { attendance, enrollments, courses, grades, payments, students, profiles } from "@/lib/drizzle/schema";
import { eq, and, sql, desc, isNotNull, gte } from "drizzle-orm";
import { teachers } from "@/lib/drizzle/schema";
import { todayInstitute } from "@/lib/validation";

export interface AttendanceByCourse {
  courseName: string;
  pct: number;
  level: string;
}

export interface GradeAvgByCourse {
  courseName: string;
  avg: number;
  level: string;
}

export interface PaymentStatusCount {
  status: string;
  count: number;
}

export interface StudentsByLevel {
  level: string;
  count: number;
}

export async function getAttendanceAvgByCourse(): Promise<AttendanceByCourse[]> {
  const rows = await db
    .select({
      courseName: courses.name,
      level: courses.level,
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(sum(case when ${attendance.status} in ('present','late') then 1 else 0 end) as int)`,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(courses.status, "active"))
    .groupBy(courses.id, courses.name, courses.level)
    .orderBy(sql`cast(sum(case when ${attendance.status} in ('present','late') then 1 else 0 end) as float) / cast(count(*) as float) desc`)
    .limit(8);

  return rows.map((r) => ({
    courseName: r.courseName,
    level: r.level,
    pct: r.total > 0 ? Math.round((r.present / r.total) * 100) : 0,
  }));
}

export async function getGradeAvgByCourse(): Promise<GradeAvgByCourse[]> {
  const rows = await db
    .select({
      courseName: courses.name,
      level: courses.level,
      avg: sql<string>`cast(avg(cast(${grades.score} as float)) as numeric(4,2))`,
    })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(courses.status, "active"))
    .groupBy(courses.id, courses.name, courses.level)
    .orderBy(courses.name)
    .limit(8);

  return rows
    .filter((r) => r.avg !== null)
    .map((r) => ({
      courseName: r.courseName,
      level: r.level,
      avg: Math.round(parseFloat(r.avg) * 10) / 10,
    }));
}

export async function getPaymentStatusCounts(): Promise<PaymentStatusCount[]> {
  // Mismo criterio que la pantalla de Pagos (SCRUM-285): una cuota sin cobrar vencida cuenta
  // como "overdue" aunque su status todavía diga "pending".
  const derived = sql<string>`case when ${payments.status} in ('pending','overdue') and ${payments.dueDate} < ${todayInstitute()} then 'overdue' when ${payments.status} = 'overdue' then 'pending' else ${payments.status}::text end`;
  const rows = await db
    .select({
      status: derived,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(payments)
    // Agrupa por la primera columna: repetir la expresión con un parámetro ($n) la haría distinta a la del SELECT.
    .groupBy(sql`1`);

  return rows.map((r) => ({ status: r.status, count: r.count }));
}

export interface DashboardCounts {
  activeStudents: number;
  totalStudents: number;
  activeCourses: number;
  totalCourses: number;
  totalTeachers: number;
  monthlyIncome: number;
}

/** Contadores del dashboard del director, calculados en SQL (sin el tope de 1000 filas de PostgREST). */
export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [s] = await db
    .select({
      active: sql<number>`cast(count(*) filter (where ${students.status} = 'active') as int)`,
      total: sql<number>`cast(count(*) as int)`,
    })
    .from(students);
  const [c] = await db
    .select({
      active: sql<number>`cast(count(*) filter (where ${courses.status} = 'active') as int)`,
      total: sql<number>`cast(count(*) as int)`,
    })
    .from(courses);
  const [t] = await db.select({ total: sql<number>`cast(count(*) as int)` }).from(teachers);

  // Ingresos del mes en curso (hora del instituto).
  const monthStart = new Date(`${todayInstitute().slice(0, 7)}-01T00:00:00-03:00`);
  const [income] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)::text` })
    .from(payments)
    .where(and(eq(payments.status, "paid"), isNotNull(payments.paidAt), gte(payments.paidAt, monthStart)));

  return {
    activeStudents: s?.active ?? 0,
    totalStudents: s?.total ?? 0,
    activeCourses: c?.active ?? 0,
    totalCourses: c?.total ?? 0,
    totalTeachers: t?.total ?? 0,
    monthlyIncome: parseFloat(income?.total ?? "0"),
  };
}

export async function getActiveStudentsByLevel(): Promise<StudentsByLevel[]> {
  const rows = await db
    .select({
      level: courses.level,
      count: sql<number>`cast(count(distinct ${enrollments.studentId}) as int)`,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(eq(enrollments.status, "active"), eq(courses.status, "active")))
    .groupBy(courses.level);

  return rows.map((r) => ({ level: r.level, count: r.count }));
}

export interface RecentEnrollment {
  id: string;
  studentName: string;
  courseName: string;
  enrolledAt: Date;
}

export interface RecentPayment {
  id: string;
  studentName: string;
  amount: string;
  paidAt: Date;
}

export async function getRecentEnrollments(): Promise<RecentEnrollment[]> {
  const rows = await db
    .select({
      id: enrollments.id,
      studentName: profiles.fullName,
      courseName: courses.name,
      enrolledAt: enrollments.enrolledAt,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .orderBy(desc(enrollments.enrolledAt))
    .limit(5);

  return rows.map((r) => ({ ...r, enrolledAt: new Date(r.enrolledAt) }));
}

export async function getRecentPayments(): Promise<RecentPayment[]> {
  const rows = await db
    .select({
      id: payments.id,
      studentName: profiles.fullName,
      amount: payments.amount,
      paidAt: payments.paidAt,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(and(eq(payments.status, "paid"), isNotNull(payments.paidAt)))
    .orderBy(desc(payments.paidAt))
    .limit(5);

  return rows.map((r) => ({ ...r, paidAt: new Date(r.paidAt!) }));
}

export interface ReportsSummary {
  attendance: { totalRecords: number; avgPct: number };
  grades: { totalGrades: number; avgScore: string; passing: number };
  payments: { totalPaid: number; totalPending: number; amountCollected: string };
}

/** Resumen de la pantalla Reportes, calculado en SQL (sin el tope de 1000 filas de PostgREST). */
export async function getReportsSummary(): Promise<ReportsSummary> {
  const [att] = await db
    .select({
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(coalesce(sum(case when ${attendance.status} in ('present','late') then 1 else 0 end), 0) as int)`,
    })
    .from(attendance);

  const [gr] = await db
    .select({
      total: sql<number>`cast(count(*) as int)`,
      avg: sql<string | null>`avg(cast(${grades.score} as float))::text`,
      passing: sql<number>`cast(coalesce(sum(case when cast(${grades.score} as float) >= 7 then 1 else 0 end), 0) as int)`,
    })
    .from(grades);

  const [pay] = await db
    .select({
      paid: sql<number>`cast(coalesce(sum(case when ${payments.status} = 'paid' then 1 else 0 end), 0) as int)`,
      pending: sql<number>`cast(coalesce(sum(case when ${payments.status} in ('pending','overdue') then 1 else 0 end), 0) as int)`,
      collected: sql<string>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amount} else 0 end), 0)::text`,
    })
    .from(payments);

  const totalAttendance = att?.total ?? 0;
  const totalGrades = gr?.total ?? 0;
  return {
    attendance: {
      totalRecords: totalAttendance,
      avgPct: totalAttendance > 0 ? Math.round(((att?.present ?? 0) / totalAttendance) * 1000) / 10 : 0,
    },
    grades: {
      totalGrades,
      avgScore: totalGrades > 0 && gr?.avg ? (Math.round(parseFloat(gr.avg) * 100) / 100).toFixed(2) : "—",
      passing: gr?.passing ?? 0,
    },
    payments: {
      totalPaid: pay?.paid ?? 0,
      totalPending: pay?.pending ?? 0,
      amountCollected: String(parseFloat(pay?.collected ?? "0")),
    },
  };
}
