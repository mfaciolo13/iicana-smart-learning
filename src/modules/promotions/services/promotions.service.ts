import { db } from "@/lib/drizzle";
import { enrollments, students, profiles, courses, attendance, grades } from "@/lib/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export const ATTENDANCE_THRESHOLD = 80;
export const GRADE_THRESHOLD = 7.0;

export interface PromotionRow {
  enrollmentId: string;
  completedAt: Date | null;
  studentName: string;
  studentDni: string;
  courseName: string;
  courseLevel: string;
  totalClasses: number;
  presentClasses: number;
  attendancePct: number | null;
  gradeAvg: number | null;
  isEligible: boolean;
}

export interface CertificateData {
  enrollmentId: string;
  completedAt: Date | null;
  studentName: string;
  studentDni: string;
  courseName: string;
  courseLevel: string;
}

export async function getPromotionEligibility(): Promise<PromotionRow[]> {
  const attendanceStats = db
    .$with("att_stats")
    .as(
      db
        .select({
          enrollmentId: attendance.enrollmentId,
          total: sql<number>`cast(count(*) as int)`,
          present: sql<number>`cast(sum(case when ${attendance.status} in ('present', 'late') then 1 else 0 end) as int)`,
        })
        .from(attendance)
        .groupBy(attendance.enrollmentId)
    );

  const gradeStats = db
    .$with("grade_stats")
    .as(
      db
        .select({
          enrollmentId: grades.enrollmentId,
          avg: sql<number | null>`round(avg(${grades.score}), 1)`,
        })
        .from(grades)
        .groupBy(grades.enrollmentId)
    );

  const rows = await db
    .with(attendanceStats, gradeStats)
    .select({
      enrollmentId: enrollments.id,
      completedAt: enrollments.completedAt,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      courseLevel: courses.level,
      totalClasses: attendanceStats.total,
      presentClasses: attendanceStats.present,
      gradeAvg: gradeStats.avg,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(attendanceStats, eq(attendanceStats.enrollmentId, enrollments.id))
    .leftJoin(gradeStats, eq(gradeStats.enrollmentId, enrollments.id))
    .where(eq(enrollments.status, "active"))
    .orderBy(profiles.fullName);

  return rows.map((r) => {
    const total = r.totalClasses ?? 0;
    const present = r.presentClasses ?? 0;
    const attendancePct = total > 0 ? Math.round((present / total) * 100) : null;
    const gradeAvg = r.gradeAvg !== null && r.gradeAvg !== undefined ? Number(r.gradeAvg) : null;

    const meetsAttendance = attendancePct !== null && attendancePct >= ATTENDANCE_THRESHOLD;
    const meetsGrades = gradeAvg !== null && gradeAvg >= GRADE_THRESHOLD;
    const isEligible = meetsAttendance && meetsGrades;

    return {
      enrollmentId: r.enrollmentId,
      completedAt: r.completedAt,
      studentName: r.studentName,
      studentDni: r.studentDni,
      courseName: r.courseName,
      courseLevel: r.courseLevel,
      totalClasses: total,
      presentClasses: present,
      attendancePct,
      gradeAvg,
      isEligible,
    };
  });
}

export async function getEnrollmentForCertificate(enrollmentId: string): Promise<CertificateData | null> {
  const [row] = await db
    .select({
      enrollmentId: enrollments.id,
      completedAt: enrollments.completedAt,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      courseLevel: courses.level,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.status, "completed")))
    .limit(1);

  return row ?? null;
}

export async function promoteEnrollment(enrollmentId: string) {
  const [updated] = await db
    .update(enrollments)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(enrollments.id, enrollmentId))
    .returning({ id: enrollments.id, studentId: enrollments.studentId });
  return updated;
}
