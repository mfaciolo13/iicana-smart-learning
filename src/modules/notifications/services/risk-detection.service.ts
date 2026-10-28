import { db } from "@/lib/drizzle";
import {
  students,
  profiles,
  enrollments,
  payments,
  attendance,
  assessments,
  assessmentAttempts,
  studentRiskAssessments,
} from "@/lib/drizzle/schema";
import { eq, and, sql, inArray, desc, ne } from "drizzle-orm";
import { todayInstitute } from "@/lib/validation";

interface RiskSignal {
  type: "overdue" | "low_attendance" | "low_assessment";
  detail: string;
}

type RiskLevel = "none" | "low" | "medium" | "high";

function computeRiskLevel(signals: RiskSignal[]): RiskLevel {
  if (signals.length === 0) return "none";
  if (signals.length === 1) return "low";
  if (signals.length === 2) return "medium";
  return "high";
}

export async function runRiskDetection(): Promise<{ assessed: number; atRisk: number }> {
  // Get all active students
  const activeStudents = await db
    .select({ id: students.id, profileId: students.profileId })
    .from(students)
    .where(eq(students.status, "active"));

  if (activeStudents.length === 0) return { assessed: 0, atRisk: 0 };

  const studentIds = activeStudents.map((s) => s.id);

  // Signal 1: overdue payments
  const overdueRows = await db
    .select({ studentId: payments.studentId })
    .from(payments)
    .where(and(eq(payments.status, "overdue"), inArray(payments.studentId, studentIds)));

  const overdueSet = new Set(overdueRows.map((r) => r.studentId));

  // Signal 2: low attendance (< 70%) — compute per enrollment, aggregate to student
  const attStats = db
    .$with("att_stats")
    .as(
      db
        .select({
          enrollmentId: attendance.enrollmentId,
          total: sql<number>`cast(count(*) as int)`.as("total"),
          present: sql<number>`cast(sum(case when ${attendance.status} in ('present','late') then 1 else 0 end) as int)`.as("present"),
        })
        .from(attendance)
        .groupBy(attendance.enrollmentId)
    );

  const attRows = await db
    .with(attStats)
    .select({ studentId: enrollments.studentId, total: attStats.total, present: attStats.present })
    .from(enrollments)
    .innerJoin(attStats, eq(attStats.enrollmentId, enrollments.id))
    .where(and(eq(enrollments.status, "active"), inArray(enrollments.studentId, studentIds)));

  const lowAttendanceSet = new Set<string>();
  for (const r of attRows) {
    const pct = r.total > 0 ? Math.round((r.present / r.total) * 100) : 100;
    if (pct < 70) lowAttendanceSet.add(r.studentId);
  }

  // Signal 3: low assessment scores (< 60% average on published assessments)
  const attemptRows = await db
    .select({
      studentId: assessmentAttempts.studentId,
      avgScore: sql<number>`cast(avg(${assessmentAttempts.score}) as numeric(5,1))`,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
    .where(eq(assessments.status, "published"))
    .groupBy(assessmentAttempts.studentId);

  const profileToStudentId = new Map(activeStudents.map((s) => [s.profileId, s.id]));
  const lowAssessmentSet = new Set<string>();
  for (const r of attemptRows) {
    // assessmentAttempts.studentId is profile_id
    const studentId = profileToStudentId.get(r.studentId);
    if (studentId && Number(r.avgScore) < 60) lowAssessmentSet.add(studentId);
  }

  // Última evaluación de cada alumno: de ahí se conserva la intervención de Dirección y se evita
  // duplicar el registro cuando la detección corre dos veces el mismo día (SCRUM-306).
  const previousRows = await db
    .select({
      id: studentRiskAssessments.id,
      studentId: studentRiskAssessments.studentId,
      assessedAt: studentRiskAssessments.assessedAt,
      intervenedAt: studentRiskAssessments.intervenedAt,
      interventionNote: studentRiskAssessments.interventionNote,
    })
    .from(studentRiskAssessments)
    .where(inArray(studentRiskAssessments.studentId, studentIds))
    .orderBy(desc(studentRiskAssessments.assessedAt));
  const latestByStudent = new Map<string, (typeof previousRows)[number]>();
  for (const row of previousRows) if (!latestByStudent.has(row.studentId)) latestByStudent.set(row.studentId, row);

  const now = new Date();
  let atRisk = 0;

  for (const student of activeStudents) {
    const signals: RiskSignal[] = [];

    if (overdueSet.has(student.id)) signals.push({ type: "overdue", detail: "Tiene pagos vencidos" });
    if (lowAttendanceSet.has(student.id)) signals.push({ type: "low_attendance", detail: "Asistencia < 70%" });
    if (lowAssessmentSet.has(student.id)) signals.push({ type: "low_assessment", detail: "Promedio de autoevaluaciones < 60%" });

    const riskLevel = computeRiskLevel(signals);

    const signalsJson = signals as unknown as typeof studentRiskAssessments.$inferInsert["signals"];
    const previous = latestByStudent.get(student.id);

    if (previous && todayInstitute(previous.assessedAt) === todayInstitute(now)) {
      // Misma jornada: se actualiza el registro de hoy (conserva la intervención) en lugar de duplicarlo.
      await db
        .update(studentRiskAssessments)
        .set({ riskLevel, signals: signalsJson, assessedAt: now })
        .where(eq(studentRiskAssessments.id, previous.id));
    } else {
      await db.insert(studentRiskAssessments).values({
        studentId: student.id,
        riskLevel,
        signals: signalsJson,
        assessedAt: now,
        // La intervención registrada sigue visible mientras el alumno continúe en riesgo.
        ...(previous?.intervenedAt && riskLevel !== "none"
          ? { intervenedAt: previous.intervenedAt, interventionNote: previous.interventionNote }
          : {}),
      });
    }

    if (riskLevel !== "none") atRisk++;
  }

  return { assessed: activeStudents.length, atRisk };
}

export interface StudentRiskRow {
  studentId: string;
  studentName: string;
  riskLevel: string;
  signals: RiskSignal[];
  assessedAt: Date;
  intervenedAt: Date | null;
  interventionNote: string | null;
  riskAssessmentId: string;
}

export async function getAtRiskStudents(): Promise<StudentRiskRow[]> {
  // Latest risk record per student (using assessedAt ordering)
  const latestPerStudent = db
    .$with("latest")
    .as(
      db
        .select({
          studentId: studentRiskAssessments.studentId,
          latestAt: sql<Date>`max(${studentRiskAssessments.assessedAt})`.as("latestAt"),
        })
        .from(studentRiskAssessments)
        .groupBy(studentRiskAssessments.studentId)
    );

  const rows = await db
    .with(latestPerStudent)
    .select({
      riskAssessmentId: studentRiskAssessments.id,
      studentId: students.id,
      studentName: profiles.fullName,
      riskLevel: studentRiskAssessments.riskLevel,
      signals: studentRiskAssessments.signals,
      assessedAt: studentRiskAssessments.assessedAt,
      intervenedAt: studentRiskAssessments.intervenedAt,
      interventionNote: studentRiskAssessments.interventionNote,
    })
    .from(latestPerStudent)
    .innerJoin(
      studentRiskAssessments,
      and(
        eq(studentRiskAssessments.studentId, latestPerStudent.studentId),
        eq(studentRiskAssessments.assessedAt, latestPerStudent.latestAt)
      )
    )
    .innerJoin(students, eq(students.id, studentRiskAssessments.studentId))
    .innerJoin(profiles, eq(profiles.id, students.profileId))
    .where(ne(studentRiskAssessments.riskLevel, "none"))
    .orderBy(desc(studentRiskAssessments.assessedAt));

  return rows as StudentRiskRow[];
}
