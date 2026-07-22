import { db } from "@/lib/drizzle";
import { enrollments, attendance, grades, payments, studentRiskAssessments } from "@/lib/drizzle/schema";
import { eq, and, sql, ne } from "drizzle-orm";

// ─── Diagnóstico: por qué pasa lo que pasa ────────────────────────────────────

export interface RiskBreakdown {
  totalAtRisk: number;
  byLevel: { low: number; medium: number; high: number };
  bySignal: { overdue: number; lowAttendance: number; lowAssessment: number };
}

// Última evaluación de riesgo por alumno, desglosada por nivel y por señal —
// responde "por qué" hay alumnos en riesgo, no solo "cuántos".
export async function getRiskBreakdown(): Promise<RiskBreakdown> {
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
      riskLevel: studentRiskAssessments.riskLevel,
      signals: studentRiskAssessments.signals,
    })
    .from(latestPerStudent)
    .innerJoin(
      studentRiskAssessments,
      and(
        eq(studentRiskAssessments.studentId, latestPerStudent.studentId),
        eq(studentRiskAssessments.assessedAt, latestPerStudent.latestAt)
      )
    )
    .where(ne(studentRiskAssessments.riskLevel, "none"));

  const breakdown: RiskBreakdown = {
    totalAtRisk: rows.length,
    byLevel: { low: 0, medium: 0, high: 0 },
    bySignal: { overdue: 0, lowAttendance: 0, lowAssessment: 0 },
  };

  for (const row of rows) {
    if (row.riskLevel === "low") breakdown.byLevel.low++;
    if (row.riskLevel === "medium") breakdown.byLevel.medium++;
    if (row.riskLevel === "high") breakdown.byLevel.high++;

    const signals = (row.signals ?? []) as { type: string }[];
    for (const s of signals) {
      if (s.type === "overdue") breakdown.bySignal.overdue++;
      if (s.type === "low_attendance") breakdown.bySignal.lowAttendance++;
      if (s.type === "low_assessment") breakdown.bySignal.lowAssessment++;
    }
  }

  return breakdown;
}

export interface AttendanceGradeCorrelation {
  lowAttendanceAvgGrade: number | null;
  highAttendanceAvgGrade: number | null;
  lowAttendanceCount: number;
  highAttendanceCount: number;
}

// Cruza asistencia y rendimiento por inscripción: ¿los alumnos con baja
// asistencia realmente sacan notas más bajas? (correlación, no solo un dato suelto)
export async function getAttendanceGradeCorrelation(): Promise<AttendanceGradeCorrelation> {
  const attStats = db
    .$with("att_stats")
    .as(
      db
        .select({
          enrollmentId: attendance.enrollmentId,
          pct: sql<number>`round(sum(case when ${attendance.status} in ('present','late') then 1 else 0 end) * 100.0 / count(*), 1)`.as("pct"),
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
          avgScore: sql<number>`avg(${grades.score})`.as("avgScore"),
        })
        .from(grades)
        .groupBy(grades.enrollmentId)
    );

  const rows = await db
    .with(attStats, gradeStats)
    .select({
      pct: attStats.pct,
      avgScore: gradeStats.avgScore,
    })
    .from(enrollments)
    .innerJoin(attStats, eq(attStats.enrollmentId, enrollments.id))
    .innerJoin(gradeStats, eq(gradeStats.enrollmentId, enrollments.id));

  const low = rows.filter((r) => r.pct < 70);
  const high = rows.filter((r) => r.pct >= 70);

  const avg = (xs: number[]) => (xs.length > 0 ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);

  return {
    lowAttendanceAvgGrade: avg(low.map((r) => Number(r.avgScore))),
    highAttendanceAvgGrade: avg(high.map((r) => Number(r.avgScore))),
    lowAttendanceCount: low.length,
    highAttendanceCount: high.length,
  };
}

// ─── Predictivo: hacia dónde va la tendencia ──────────────────────────────────

function linearProjection(values: number[]): number {
  const n = values.length;
  if (n < 2) return values[0] ?? 0;
  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - xMean) * (values[i] - yMean), 0);
  const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return Math.max(0, Math.round(slope * n + intercept));
}

export interface MonthlyPoint {
  month: string; // "2026-06"
  total: number;
}

export interface PaymentTrend {
  months: MonthlyPoint[];
  projectedNextMonth: number;
}

// Recaudación mensual (últimos 6 meses) + proyección lineal del próximo mes —
// no es "cuánto se cobró", es "cuánto se va a cobrar si sigue la tendencia".
export async function getPaymentTrend(): Promise<PaymentTrend> {
  const rows = await db
    .select({
      month: sql<string>`to_char(${payments.paidAt}, 'YYYY-MM')`,
      total: sql<number>`sum(${payments.amount})`,
    })
    .from(payments)
    .where(and(eq(payments.status, "paid"), sql`${payments.paidAt} >= now() - interval '6 months'`))
    .groupBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`);

  const months = rows.map((r) => ({ month: r.month, total: Math.round(Number(r.total)) }));
  const projectedNextMonth = linearProjection(months.map((m) => m.total));

  return { months, projectedNextMonth };
}

export interface RiskTrend {
  points: { date: string; atRisk: number }[];
  projectedNext: number | null;
  hasEnoughHistory: boolean;
}

// Evolución de alumnos en riesgo entre corridas del detector — si hay al menos
// 2 corridas registradas, proyecta la próxima; si no, lo dice explícitamente
// en vez de inventar un número con un solo dato.
export async function getRiskTrend(): Promise<RiskTrend> {
  const rows = await db
    .select({
      date: sql<string>`to_char(${studentRiskAssessments.assessedAt}, 'YYYY-MM-DD')`,
      atRisk: sql<number>`cast(count(*) filter (where ${studentRiskAssessments.riskLevel} != 'none') as int)`,
    })
    .from(studentRiskAssessments)
    .groupBy(sql`to_char(${studentRiskAssessments.assessedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${studentRiskAssessments.assessedAt}, 'YYYY-MM-DD')`);

  const points = rows.map((r) => ({ date: r.date, atRisk: r.atRisk }));
  const hasEnoughHistory = points.length >= 2;

  return {
    points,
    projectedNext: hasEnoughHistory ? linearProjection(points.map((p) => p.atRisk)) : null,
    hasEnoughHistory,
  };
}
