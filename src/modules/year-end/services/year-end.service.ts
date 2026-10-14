import { db } from "@/lib/drizzle";
import { enrollments, students, profiles, courses, attendance, grades } from "@/lib/drizzle/schema";
import { eq, sql, inArray, notInArray, and } from "drizzle-orm";
import { meetsAttendance, meetsGrades, displayAverage } from "@/modules/promotions/eligibility";

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
          avg: sql<number | null>`round(avg(${grades.score}), 4)`,
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
    const rawAvg = r.gradeAvg !== null && r.gradeAvg !== undefined ? Number(r.gradeAvg) : null;
    const gradeAvg = displayAverage(rawAvg);

    let outcome: YearEndRow["outcome"];
    if (r.enrollmentStatus === "withdrawn") {
      outcome = "withdrawn";
    } else if (r.enrollmentStatus === "completed") {
      outcome = "promoted";
    } else if (attendancePct === null && rawAvg === null) {
      outcome = "no_data";
    } else {
      outcome = meetsAttendance(present, total) && meetsGrades(rawAvg) ? "eligible" : "insufficient";
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

export interface PromotedStudent {
  email: string;
  fullName: string;
  courseName: string;
}

export async function consolidateYearEnd(): Promise<{ promoted: number; graduated: number; promotedStudents: PromotedStudent[] }> {
  const { rows } = await getYearEndReport();

  const eligibleRows = rows.filter((r) => r.outcome === "eligible");
  const eligibleIds = eligibleRows.map((r) => r.enrollmentId);

  if (eligibleIds.length > 0) {
    await db
      .update(enrollments)
      .set({ status: "completed", completedAt: new Date() })
      .where(inArray(enrollments.id, eligibleIds));
  }

  // Fetch emails for promoted students
  let promotedStudents: PromotedStudent[] = [];
  if (eligibleIds.length > 0) {
    const emailRows = await db
      .select({ email: profiles.email, fullName: profiles.fullName, courseName: courses.name })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(profiles, eq(students.profileId, profiles.id))
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(inArray(enrollments.id, eligibleIds));
    promotedStudents = emailRows;
  }

  // Mark students as graduated if all their enrollments are now completed
  const affectedStudentIds = [...new Set(eligibleRows.map((r) => r.studentId))];
  let graduated = 0;

  for (const studentId of affectedStudentIds) {
    const active = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      // Una baja vieja (withdrawn) no debe impedir el egreso (SCRUM-259).
      .where(and(eq(enrollments.studentId, studentId), notInArray(enrollments.status, ["completed", "withdrawn"])))
      .limit(1);

    if (active.length === 0) {
      await db
        .update(students)
        .set({ status: "graduated", updatedAt: new Date() })
        .where(eq(students.id, studentId));
      graduated++;
    }
  }

  return { promoted: eligibleIds.length, graduated, promotedStudents };
}
