import { db } from "@/lib/drizzle";
import { attendance, enrollments, courses, grades, payments, students } from "@/lib/drizzle/schema";
import { eq, and, count, sql } from "drizzle-orm";

export interface AttendanceByCourse {
  courseName: string;
  pct: number;
}

export interface GradeAvgByCourse {
  courseName: string;
  avg: number;
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
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(sum(case when ${attendance.status} in ('present','late') then 1 else 0 end) as int)`,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(courses.status, "active"))
    .groupBy(courses.id, courses.name)
    .orderBy(sql`cast(sum(case when ${attendance.status} in ('present','late') then 1 else 0 end) as float) / cast(count(*) as float) desc`)
    .limit(8);

  return rows.map((r) => ({
    courseName: r.courseName,
    pct: r.total > 0 ? Math.round((r.present / r.total) * 100) : 0,
  }));
}

export async function getGradeAvgByCourse(): Promise<GradeAvgByCourse[]> {
  const rows = await db
    .select({
      courseName: courses.name,
      avg: sql<string>`cast(avg(cast(${grades.score} as float)) as numeric(4,2))`,
    })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(courses.status, "active"))
    .groupBy(courses.id, courses.name)
    .orderBy(courses.name)
    .limit(8);

  return rows
    .filter((r) => r.avg !== null)
    .map((r) => ({
      courseName: r.courseName,
      avg: Math.round(parseFloat(r.avg) * 10) / 10,
    }));
}

export async function getPaymentStatusCounts(): Promise<PaymentStatusCount[]> {
  const rows = await db
    .select({
      status: payments.status,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(payments)
    .groupBy(payments.status);

  return rows.map((r) => ({ status: r.status, count: r.count }));
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
