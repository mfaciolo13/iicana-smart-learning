import { db } from "@/lib/drizzle";
import { enrollments, students, profiles, courses, attendance, grades } from "@/lib/drizzle/schema";
import { eq, sql, inArray, and, ne } from "drizzle-orm";
import { ATTENDANCE_THRESHOLD, GRADE_THRESHOLD } from "@/modules/promotions/services/promotions.service";

export interface YearEndRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentDni: string;
  studentStatus: string;
  courseName: string;
  courseLevel: string;
  enrollmentStatus: string;
  attendancePct: number | null;
  gradeAvg: number | null;
  outcome: "promoted" | "eligible" | "insufficient" | "no_data" | "withdrawn";
}

export interface YearEndSummary {
  promoted: number;
  eligible: number;
  insufficient: number;
  withdrawn: number;
  noData: number;
  total: number;
}

export async function getYearEndReport(): Promise<{ rows: YearEndRow[]; summary: YearEndSummary }> {
  const attStats = db
    .$with("att")
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

  const gradeStats = db
    .$with("gr")
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
    .with(attStats, gradeStats)
    .select({
      enrollmentId: enrollments.id,
      studentId: students.id,
      studentName: profiles.fullName,
      studentDni: students.dni,
      studentStatus: students.status,
      courseName: courses.name,
      courseLevel: courses.level,
      enrollmentStatus: enrollments.status,
      totalClasses: attStats.total,
      presentClasses: attStats.present,
      gradeAvg: gradeStats.avg,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(attStats, eq(attStats.enrollmentId, enrollments.id))
    .leftJoin(gradeStats, eq(gradeStats.enrollmentId, enrollments.id))
    .orderBy(profiles.fullName);

  const result: YearEndRow[] = rows.map((r) => {
    const total = r.totalClasses ?? 0;
    const present = r.presentClasses ?? 0;
    const attendancePct = total > 0 ? Math.round((present / total) * 100) : null;
    const gradeAvg = r.gradeAvg !== null && r.gradeAvg !== undefined ? Number(r.gradeAvg) : null;

    let outcome: YearEndRow["outcome"];
    if (r.enrollmentStatus === "withdrawn") {
      outcome = "withdrawn";
    } else if (r.enrollmentStatus === "completed") {
      outcome = "promoted";
    } else if (attendancePct === null && gradeAvg === null) {
      outcome = "no_data";
    } else {
      const meetsAttendance = attendancePct !== null && attendancePct >= ATTENDANCE_THRESHOLD;
      const meetsGrades = gradeAvg !== null && gradeAvg >= GRADE_THRESHOLD;
      outcome = meetsAttendance && meetsGrades ? "eligible" : "insufficient";
    }

    return {
      enrollmentId: r.enrollmentId,
      studentId: r.studentId,
      studentName: r.studentName,
      studentDni: r.studentDni,
      studentStatus: r.studentStatus,
      courseName: r.courseName,
      courseLevel: r.courseLevel,
      enrollmentStatus: r.enrollmentStatus,
      attendancePct,
      gradeAvg,
      outcome,
    };
  });

  const summary: YearEndSummary = {
    promoted: result.filter((r) => r.outcome === "promoted").length,
    eligible: result.filter((r) => r.outcome === "eligible").length,
    insufficient: result.filter((r) => r.outcome === "insufficient").length,
    withdrawn: result.filter((r) => r.outcome === "withdrawn").length,
    noData: result.filter((r) => r.outcome === "no_data").length,
    total: result.length,
  };

  return { rows: result, summary };
}

export async function consolidateYearEnd(): Promise<{ promoted: number; graduated: number }> {
  const { rows } = await getYearEndReport();

  // Promote all eligible active enrollments
  const eligibleIds = rows
    .filter((r) => r.outcome === "eligible")
    .map((r) => r.enrollmentId);

  if (eligibleIds.length > 0) {
    await db
      .update(enrollments)
      .set({ status: "completed", completedAt: new Date() })
      .where(inArray(enrollments.id, eligibleIds));
  }

  // Mark students as graduated if all their enrollments are now completed
  const affectedStudentIds = [...new Set(rows.filter((r) => r.outcome === "eligible").map((r) => r.studentId))];
  let graduated = 0;

  for (const studentId of affectedStudentIds) {
    const active = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), ne(enrollments.status, "completed")))
      .limit(1);

    if (active.length === 0) {
      await db
        .update(students)
        .set({ status: "graduated", updatedAt: new Date() })
        .where(eq(students.id, studentId));
      graduated++;
    }
  }

  return { promoted: eligibleIds.length, graduated };
}
