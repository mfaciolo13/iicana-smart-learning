import { db } from "@/lib/drizzle";
import { attendance, enrollments, students, courses, profiles, teachers } from "@/lib/drizzle/schema";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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

export interface AbsenceAlertInfo {
  enrollmentId: string;
  studentProfileId: string;
  studentEmail: string;
  studentName: string;
  courseName: string;
  attendancePct: number;
}

export async function getAbsenceAlertInfo(enrollmentIds: string[]): Promise<AbsenceAlertInfo[]> {
  if (enrollmentIds.length === 0) return [];

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
        .where(inArray(attendance.enrollmentId, enrollmentIds))
        .groupBy(attendance.enrollmentId)
    );

  const rows = await db
    .with(attendanceStats)
    .select({
      enrollmentId: enrollments.id,
      studentProfileId: students.profileId,
      studentEmail: profiles.email,
      studentName: profiles.fullName,
      courseName: courses.name,
      total: attendanceStats.total,
      present: attendanceStats.present,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(attendanceStats, eq(attendanceStats.enrollmentId, enrollments.id))
    .where(inArray(enrollments.id, enrollmentIds));

  return rows.map((r) => {
    const total = r.total ?? 0;
    const present = r.present ?? 0;
    return {
      enrollmentId: r.enrollmentId,
      studentProfileId: r.studentProfileId,
      studentEmail: r.studentEmail,
      studentName: r.studentName,
      courseName: r.courseName,
      attendancePct: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  });
}

const LOW_ATTENDANCE_THRESHOLD = 70;

export interface LowAttendanceAlert {
  enrollmentId: string;
  studentName: string;
  courseName: string;
  teacherEmail: string;
  teacherName: string;
  teacherProfileId: string;
  attendancePct: number;
}

/**
 * Returns enrollments that just crossed below the 70% attendance threshold
 * for the first time (was ≥70% before today's absent class, now <70%).
 * Only fires once naturally — the crossing only happens once.
 */
export async function checkLowAttendanceThreshold(
  absentEnrollmentIds: string[]
): Promise<LowAttendanceAlert[]> {
  if (absentEnrollmentIds.length === 0) return [];

  // All attendance for these enrollments
  const allRecords = await db
    .select({ enrollmentId: attendance.enrollmentId, status: attendance.status, classDate: attendance.classDate })
    .from(attendance)
    .where(inArray(attendance.enrollmentId, absentEnrollmentIds));

  const alerts: string[] = [];

  const byEnrollment = new Map<string, { status: string; classDate: string }[]>();
  for (const r of allRecords) {
    const list = byEnrollment.get(r.enrollmentId) ?? [];
    list.push({ status: r.status, classDate: r.classDate });
    byEnrollment.set(r.enrollmentId, list);
  }

  for (const [enrollmentId, records] of byEnrollment) {
    const total = records.length;
    if (total === 0) continue;

    const present = records.filter((r) => r.status === "present" || r.status === "late").length;
    const currentPct = Math.round((present / total) * 100);

    // "before today" = exclude today's absent record (1 fewer total, same present count)
    const prevTotal = total - 1;
    if (prevTotal === 0) continue;
    const prevPct = Math.round((present / prevTotal) * 100);

    // Only alert when crossing below the threshold for the first time
    if (prevPct >= LOW_ATTENDANCE_THRESHOLD && currentPct < LOW_ATTENDANCE_THRESHOLD) {
      alerts.push(enrollmentId);
    }
  }

  if (alerts.length === 0) return [];

  const teacherProfiles = alias(profiles, "teacher_profiles");

  const rows = await db
    .select({
      enrollmentId: enrollments.id,
      studentName: profiles.fullName,
      courseName: courses.name,
      teacherEmail: teacherProfiles.email,
      teacherName: teacherProfiles.fullName,
      teacherProfileId: teacherProfiles.id,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(teachers, eq(courses.teacherId, teachers.id))
    .innerJoin(teacherProfiles, eq(teachers.profileId, teacherProfiles.id))
    .where(inArray(enrollments.id, alerts));

  // Re-compute attendance pct for the result
  return rows.map((r) => {
    const records = byEnrollment.get(r.enrollmentId) ?? [];
    const total = records.length;
    const present = records.filter((x) => x.status === "present" || x.status === "late").length;
    return {
      ...r,
      attendancePct: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  });
}

export async function recordBulkAttendance(
  records: { enrollmentId: string; classDate: string; status: "present" | "absent" | "late"; notes?: string | null }[]
) {
  if (records.length === 0) return;
  // onConflictDoNothing: red de seguridad ante envíos concurrentes/duplicados del mismo
  // formulario — el constraint único (enrollment_id, class_date) es lo que realmente lo impide.
  await db
    .insert(attendance)
    .values(
      records.map((r) => ({
        enrollmentId: r.enrollmentId,
        classDate: r.classDate,
        status: r.status,
        notes: r.notes ?? null,
      }))
    )
    .onConflictDoNothing({ target: [attendance.enrollmentId, attendance.classDate] });
}

/**
 * Corrige una toma de lista ya registrada. Sobrescribe el estado de cada alumno y
 * deja traza de quién corrigió y cuándo (columnas updated_at / updated_by).
 *
 * Solo toca los registros de la sesión (curso + fecha) indicada: si un alumno se
 * inscribió después de la toma original, no se le inventa un registro retroactivo.
 */
export async function updateAttendanceSession(
  courseId: string,
  classDate: string,
  records: { enrollmentId: string; status: "present" | "absent" | "late"; notes?: string | null }[],
  updatedBy: string
): Promise<number> {
  if (records.length === 0) return 0;

  // Solo se pueden corregir enrollments que pertenezcan a este curso — evita que un
  // enrollmentId manipulado en el formulario escriba sobre la asistencia de otro curso.
  const validRows = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.courseId, courseId),
        inArray(
          enrollments.id,
          records.map((r) => r.enrollmentId)
        )
      )
    );
  const validIds = new Set(validRows.map((r) => r.id));

  let updated = 0;
  for (const record of records) {
    if (!validIds.has(record.enrollmentId)) continue;
    const result = await db
      .update(attendance)
      .set({
        status: record.status,
        notes: record.notes ?? null,
        updatedAt: new Date(),
        updatedBy,
      })
      .where(
        and(
          eq(attendance.enrollmentId, record.enrollmentId),
          eq(attendance.classDate, classDate)
        )
      )
      .returning({ id: attendance.id });
    updated += result.length;
  }

  return updated;
}

/**
 * Elimina por completo una toma de lista (curso + fecha). Se usa cuando la clase
 * no llegó a dictarse o se cargó sobre el curso equivocado: en esos casos corregir
 * alumno por alumno no aplica, porque la sesión entera no debería existir.
 */
export async function deleteAttendanceSession(courseId: string, classDate: string): Promise<number> {
  const sessionEnrollments = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId));

  if (sessionEnrollments.length === 0) return 0;

  const deleted = await db
    .delete(attendance)
    .where(
      and(
        inArray(
          attendance.enrollmentId,
          sessionEnrollments.map((e) => e.id)
        ),
        eq(attendance.classDate, classDate)
      )
    )
    .returning({ id: attendance.id });

  return deleted.length;
}

export async function allEnrollmentsInCourse(courseId: string, enrollmentIds: string[]): Promise<boolean> {
  // true si todas las inscripciones pertenecen al curso (evita tomar lista con inscripciones ajenas).
  const unique = [...new Set(enrollmentIds)];
  if (unique.length === 0) return true;
  const rows = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), inArray(enrollments.id, unique)));
  return rows.length === unique.length;
}
