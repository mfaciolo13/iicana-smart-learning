import { db } from "@/lib/drizzle";
import { attendance, enrollments, students, courses, profiles, teachers } from "@/lib/drizzle/schema";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";
import type { AttendanceRecord, AttendanceSession } from "../types";

export async function getAttendanceByCourse(
  courseId: string,
  classDate: string
): Promise<AttendanceRecord[]> {
  const rows = await db
    .select({
      id: attendance.id,
      enrollmentId: attendance.enrollmentId,
      classDate: attendance.classDate,
      status: attendance.status,
      notes: attendance.notes,
      createdAt: attendance.createdAt,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(
      and(eq(enrollments.courseId, courseId), eq(attendance.classDate, classDate))
    )
    .orderBy(profiles.fullName);

  return rows as AttendanceRecord[];
}

export async function getAttendanceByStudent(studentId: string): Promise<AttendanceRecord[]> {
  const rows = await db
    .select({
      id: attendance.id,
      enrollmentId: attendance.enrollmentId,
      classDate: attendance.classDate,
      status: attendance.status,
      notes: attendance.notes,
      createdAt: attendance.createdAt,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.studentId, studentId))
    .orderBy(desc(attendance.classDate));

  return rows as AttendanceRecord[];
}

export async function getRecentSessions(limit = 20): Promise<AttendanceSession[]> {
  const rows = await db
    .select({
      classDate: attendance.classDate,
      courseName: courses.name,
      courseId: courses.id,
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(sum(case when ${attendance.status} = 'present' then 1 else 0 end) as int)`,
      absent: sql<number>`cast(sum(case when ${attendance.status} = 'absent' then 1 else 0 end) as int)`,
      late: sql<number>`cast(sum(case when ${attendance.status} = 'late' then 1 else 0 end) as int)`,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .groupBy(attendance.classDate, courses.id, courses.name)
    .orderBy(desc(attendance.classDate))
    .limit(limit);

  return rows as AttendanceSession[];
}

export async function getRecentSessionsByTeacher(teacherProfileId: string, limit = 30): Promise<AttendanceSession[]> {
  const rows = await db
    .select({
      classDate: attendance.classDate,
      courseName: courses.name,
      courseId: courses.id,
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(sum(case when ${attendance.status} = 'present' then 1 else 0 end) as int)`,
      absent: sql<number>`cast(sum(case when ${attendance.status} = 'absent' then 1 else 0 end) as int)`,
      late: sql<number>`cast(sum(case when ${attendance.status} = 'late' then 1 else 0 end) as int)`,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(teachers, eq(courses.teacherId, teachers.id))
    .where(eq(teachers.profileId, teacherProfileId))
    .groupBy(attendance.classDate, courses.id, courses.name)
    .orderBy(desc(attendance.classDate))
    .limit(limit);

  return rows as AttendanceSession[];
}

export async function isAttendanceRecorded(courseId: string, classDate: string): Promise<boolean> {
  const [row] = await db
    .select({ total: count() })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .where(and(eq(enrollments.courseId, courseId), eq(attendance.classDate, classDate)));

  return (row?.total ?? 0) > 0;
}

export interface ConsecutiveAbsenceAlert {
  enrollmentId: string;
  studentName: string;
  courseName: string;
  studentProfileId: string;
}

export async function checkConsecutiveAbsences(
  absentEnrollmentIds: string[]
): Promise<ConsecutiveAbsenceAlert[]> {
  if (absentEnrollmentIds.length === 0) return [];

  // Get last 2 attendance records for each absent enrollment
  const lastTwo = await db
    .select({
      enrollmentId: attendance.enrollmentId,
      status: attendance.status,
    })
    .from(attendance)
    .where(inArray(attendance.enrollmentId, absentEnrollmentIds))
    .orderBy(attendance.enrollmentId, desc(attendance.classDate));

  // Group by enrollment and keep only last 2
  const byEnrollment = new Map<string, string[]>();
  for (const row of lastTwo) {
    const list = byEnrollment.get(row.enrollmentId) ?? [];
    if (list.length < 2) list.push(row.status);
    byEnrollment.set(row.enrollmentId, list);
  }

  // Find enrollments with 2 consecutive absences
  const triggered = [...byEnrollment.entries()]
    .filter(([, statuses]) => statuses.length === 2 && statuses[0] === "absent" && statuses[1] === "absent")
    .map(([id]) => id);

  if (triggered.length === 0) return [];

  // Fetch student + course info for triggered enrollments
  return db
    .select({
      enrollmentId: enrollments.id,
      studentName: profiles.fullName,
      courseName: courses.name,
      studentProfileId: students.profileId,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(inArray(enrollments.id, triggered));
}

export async function recordBulkAttendance(
  records: { enrollmentId: string; classDate: string; status: "present" | "absent" | "late"; notes?: string | null }[]
) {
  if (records.length === 0) return;
  await db.insert(attendance).values(
    records.map((r) => ({
      enrollmentId: r.enrollmentId,
      classDate: r.classDate,
      status: r.status,
      notes: r.notes ?? null,
    }))
  );
}
