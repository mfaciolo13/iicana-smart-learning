import { unstable_cache } from "next/cache";
import { ANALYTICS_TAG } from "@/lib/analytics-cache";
import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import {
  attendance,
  complaints,
  courses,
  enrollments,
  grades,
  inquiries,
  marketingCampaigns,
  payments,
  studentRiskAssessments,
  students,
} from "@/lib/drizzle/schema";
import { getTeacherEvalSummaries } from "@/modules/teacher-evaluations/services/teacher-evaluations.service";
import { todayInstitute } from "@/lib/validation";
import { fillMonths, lastMonths, windowStart } from "../lib/months";

/** Meses que muestran los gráficos de evolución. */
export const MONTHS = 6;

/**
 * Los gráficos no necesitan tiempo real al segundo: se cachean 60 s y el panel carga rápido
 * en las visitas siguientes. Las consultas devuelven sólo objetos planos (serializables).
 */
const CACHE_SECONDS = 60;

export interface AgingBucket {
  bucket: string;
  amount: number;
  count: number;
}

const AGING_ORDER = ["Al día", "1–15 días", "16–30 días", "Más de 30 días"];

// ── Finanzas ────────────────────────────────────────────────────────────────

export interface FinanceAnalytics {
  /** Por mes de vencimiento: lo facturado (sin anuladas) y lo efectivamente cobrado. */
  byMonth: { mes: string; facturado: number | null; cobrado: number | null }[];
  /** Tasa de cobro del período (cobrado / facturado, en %). */
  collectionRate: number | null;
  /** Deuda (sin cobrar, incluida la suspendida) por antigüedad del vencimiento. */
  aging: AgingBucket[];
  totalDebt: number;
}

export async function loadFinance(): Promise<FinanceAnalytics> {
  const today = todayInstitute();
  const months = lastMonths(MONTHS, today);

  const monthKey = sql<string>`to_char(${payments.dueDate}, 'YYYY-MM')`;
  const byMonthRows = await db
    .select({
      m: monthKey,
      facturado: sql<string>`coalesce(sum(case when ${payments.status} <> 'cancelled' then ${payments.amount} else 0 end), 0)::text`,
      cobrado: sql<string>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amount} else 0 end), 0)::text`,
    })
    .from(payments)
    .where(gte(payments.dueDate, windowStart(MONTHS, today)))
    .groupBy(sql`1`);

  const byMonth = fillMonths(months, byMonthRows, ["facturado", "cobrado"]);
  const billed = byMonth.reduce((s, p) => s + (p.facturado ?? 0), 0);
  const collected = byMonth.reduce((s, p) => s + (p.cobrado ?? 0), 0);

  const bucket = sql<string>`case
    when ${payments.dueDate} >= ${today}::date then 'Al día'
    when ${today}::date - ${payments.dueDate} <= 15 then '1–15 días'
    when ${today}::date - ${payments.dueDate} <= 30 then '16–30 días'
    else 'Más de 30 días' end`;
  const agingRows = await db
    .select({
      bucket,
      amount: sql<string>`coalesce(sum(${payments.amount}), 0)::text`,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(payments)
    .where(inArray(payments.status, ["pending", "overdue", "suspended"]))
    .groupBy(sql`1`);

  const aging = AGING_ORDER.map((b) => {
    const r = agingRows.find((x) => x.bucket === b);
    return { bucket: b, amount: Number(r?.amount ?? 0), count: r?.count ?? 0 };
  });

  return {
    byMonth,
    collectionRate: billed > 0 ? Math.round((collected / billed) * 1000) / 10 : null,
    aging,
    totalDebt: aging.reduce((s, a) => s + a.amount, 0),
  };
}

export const getFinanceAnalytics = unstable_cache(loadFinance, ["analytics-finance"], { revalidate: CACHE_SECONDS, tags: [ANALYTICS_TAG] });

// ── Académico ───────────────────────────────────────────────────────────────

export interface AcademicAnalytics {
  attendanceByMonth: { mes: string; asistencia: number | null }[];
  gradesByMonth: { mes: string; promedio: number | null }[];
  gradeDistribution: { rango: string; notas: number }[];
  occupancy: { curso: string; inscriptos: number; cupo: number; ocupacion: number }[];
}

const GRADE_BUCKETS = ["1–3", "4–5", "6", "7", "8", "9–10"];

export async function loadAcademic(): Promise<AcademicAnalytics> {
  const today = todayInstitute();
  const months = lastMonths(MONTHS, today);
  const start = windowStart(MONTHS, today);

  const attRows = await db
    .select({
      m: sql<string>`to_char(${attendance.classDate}, 'YYYY-MM')`,
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(count(*) filter (where ${attendance.status} in ('present','late')) as int)`,
    })
    .from(attendance)
    .where(gte(attendance.classDate, start))
    .groupBy(sql`1`);
  const attendanceByMonth = fillMonths(
    months,
    attRows.map((r) => ({ m: r.m, asistencia: r.total > 0 ? Math.round((r.present / r.total) * 1000) / 10 : null })),
    ["asistencia"],
    null
  );

  const gradeRows = await db
    .select({
      m: sql<string>`to_char(${grades.evaluatedAt} at time zone 'America/Argentina/Cordoba', 'YYYY-MM')`,
      promedio: sql<string>`round(avg(cast(${grades.score} as float))::numeric, 2)::text`,
    })
    .from(grades)
    .where(gte(grades.evaluatedAt, new Date(`${start}T00:00:00-03:00`)))
    .groupBy(sql`1`);
  const gradesByMonth = fillMonths(months, gradeRows, ["promedio"], null);

  const distBucket = sql<string>`case
    when cast(${grades.score} as float) < 4 then '1–3'
    when cast(${grades.score} as float) < 6 then '4–5'
    when cast(${grades.score} as float) < 7 then '6'
    when cast(${grades.score} as float) < 8 then '7'
    when cast(${grades.score} as float) < 9 then '8'
    else '9–10' end`;
  const distRows = await db
    .select({ rango: distBucket, notas: sql<number>`cast(count(*) as int)` })
    .from(grades)
    .groupBy(sql`1`);
  const gradeDistribution = GRADE_BUCKETS.map((rango) => ({
    rango,
    notas: distRows.find((r) => r.rango === rango)?.notas ?? 0,
  }));

  const occRows = await db
    .select({
      curso: courses.name,
      cupo: courses.maxCapacity,
      inscriptos: sql<number>`cast(count(${enrollments.id}) filter (where ${enrollments.status} = 'active') as int)`,
    })
    .from(courses)
    .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(eq(courses.status, "active"))
    .groupBy(courses.id, courses.name, courses.maxCapacity)
    .orderBy(courses.name);
  const occupancy = occRows.map((r) => ({
    curso: r.curso,
    inscriptos: r.inscriptos,
    cupo: r.cupo,
    ocupacion: r.cupo > 0 ? Math.round((r.inscriptos / r.cupo) * 100) : 0,
  }));

  return { attendanceByMonth, gradesByMonth, gradeDistribution, occupancy };
}

export const getAcademicAnalytics = unstable_cache(loadAcademic, ["analytics-academic"], { revalidate: CACHE_SECONDS, tags: [ANALYTICS_TAG] });

// ── Personas ────────────────────────────────────────────────────────────────

export interface PeopleAnalytics {
  enrollmentsByMonth: { mes: string; altas: number | null }[];
  studentsByStatus: { estado: string; alumnos: number }[];
  riskByLevel: { nivel: string; alumnos: number }[];
}

const STUDENT_STATUS_LABELS: Record<string, string> = {
  active: "Activos",
  inactive: "Inactivos",
  suspended: "Suspendidos",
  graduated: "Egresados",
};
const RISK_LABELS: Record<string, string> = { low: "Bajo", medium: "Medio", high: "Alto" };

export async function loadPeople(): Promise<PeopleAnalytics> {
  const today = todayInstitute();
  const months = lastMonths(MONTHS, today);

  const enrRows = await db
    .select({
      m: sql<string>`to_char(${enrollments.enrolledAt} at time zone 'America/Argentina/Cordoba', 'YYYY-MM')`,
      altas: sql<number>`cast(count(*) as int)`,
    })
    .from(enrollments)
    .where(gte(enrollments.enrolledAt, new Date(`${windowStart(MONTHS, today)}T00:00:00-03:00`)))
    .groupBy(sql`1`);

  const statusRows = await db
    .select({ estado: students.status, alumnos: sql<number>`cast(count(*) as int)` })
    .from(students)
    .groupBy(students.status);

  // Última evaluación de riesgo de cada alumno activo (la tabla guarda una por día).
  const latest = db
    .selectDistinctOn([studentRiskAssessments.studentId], {
      studentId: studentRiskAssessments.studentId,
      riskLevel: studentRiskAssessments.riskLevel,
    })
    .from(studentRiskAssessments)
    .innerJoin(students, eq(students.id, studentRiskAssessments.studentId))
    .where(eq(students.status, "active"))
    .orderBy(studentRiskAssessments.studentId, desc(studentRiskAssessments.assessedAt))
    .as("latest_risk");
  const riskRows = await db
    .select({ nivel: latest.riskLevel, alumnos: sql<number>`cast(count(*) as int)` })
    .from(latest)
    .groupBy(latest.riskLevel);

  return {
    enrollmentsByMonth: fillMonths(months, enrRows, ["altas"]),
    studentsByStatus: statusRows.map((r) => ({ estado: STUDENT_STATUS_LABELS[r.estado] ?? r.estado, alumnos: r.alumnos })),
    riskByLevel: ["low", "medium", "high"].map((l) => ({
      nivel: RISK_LABELS[l],
      alumnos: riskRows.find((r) => r.nivel === l)?.alumnos ?? 0,
    })),
  };
}

export const getPeopleAnalytics = unstable_cache(loadPeople, ["analytics-people"], { revalidate: CACHE_SECONDS, tags: [ANALYTICS_TAG] });

// ── Calidad y atención ──────────────────────────────────────────────────────

export interface QualityAnalytics {
  teacherRatings: { docente: string; calificacion: number; encuestas: number }[];
  complaintsByStatus: { estado: string; reclamos: number }[];
  complaintsByType: { tipo: string; reclamos: number }[];
  inquiriesByStatus: { estado: string; consultas: number }[];
  inquiriesByChannel: { canal: string; consultas: number; inscriptos: number }[];
}

const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  open: "Abiertos",
  in_progress: "En proceso",
  resolved: "Resueltos",
  closed: "Cerrados",
};
const COMPLAINT_TYPE_LABELS: Record<string, string> = {
  academic: "Académico",
  administrative: "Administrativo",
  infrastructure: "Infraestructura",
  teacher: "Docente",
};
const INQUIRY_STATUS_LABELS: Record<string, string> = { pending: "Pendientes", enrolled: "Inscriptos", lost: "Perdidos" };
const CHANNEL_LABELS: Record<string, string> = {
  social_media: "Redes sociales",
  email: "Email",
  flyers: "Folletos",
  word_of_mouth: "Boca a boca",
  website: "Sitio web",
  other: "Otro",
};

export async function loadQuality(): Promise<QualityAnalytics> {
  const summaries = await getTeacherEvalSummaries();
  const teacherRatings = summaries
    .filter((t) => t.avgRating !== null && t.surveyCount > 0)
    .map((t) => ({ docente: t.teacherName, calificacion: Number(t.avgRating), encuestas: t.surveyCount }))
    .sort((a, b) => b.calificacion - a.calificacion);

  const complaintRows = await db
    .select({
      status: complaints.status,
      type: complaints.type,
      n: sql<number>`cast(count(*) as int)`,
    })
    .from(complaints)
    .groupBy(complaints.status, complaints.type);
  const sumBy = (key: "status" | "type") => {
    const map = new Map<string, number>();
    for (const r of complaintRows) map.set(r[key], (map.get(r[key]) ?? 0) + r.n);
    return map;
  };
  const byStatus = sumBy("status");
  const byType = sumBy("type");

  const inquiryRows = await db
    .select({
      channel: marketingCampaigns.channel,
      status: inquiries.status,
      n: sql<number>`cast(count(*) as int)`,
    })
    .from(inquiries)
    .leftJoin(marketingCampaigns, eq(marketingCampaigns.id, inquiries.campaignId))
    .groupBy(marketingCampaigns.channel, inquiries.status);
  const inqStatus = new Map<string, number>();
  const inqChannel = new Map<string, { total: number; enrolled: number }>();
  for (const r of inquiryRows) {
    inqStatus.set(r.status, (inqStatus.get(r.status) ?? 0) + r.n);
    const label = r.channel ? CHANNEL_LABELS[r.channel] ?? r.channel : "Sin campaña";
    const cur = inqChannel.get(label) ?? { total: 0, enrolled: 0 };
    cur.total += r.n;
    if (r.status === "enrolled") cur.enrolled += r.n;
    inqChannel.set(label, cur);
  }

  return {
    teacherRatings,
    complaintsByStatus: Object.entries(COMPLAINT_STATUS_LABELS).map(([k, label]) => ({ estado: label, reclamos: byStatus.get(k) ?? 0 })),
    complaintsByType: Object.entries(COMPLAINT_TYPE_LABELS)
      .map(([k, label]) => ({ tipo: label, reclamos: byType.get(k) ?? 0 }))
      .filter((r) => r.reclamos > 0),
    inquiriesByStatus: Object.entries(INQUIRY_STATUS_LABELS).map(([k, label]) => ({ estado: label, consultas: inqStatus.get(k) ?? 0 })),
    inquiriesByChannel: [...inqChannel.entries()]
      .map(([canal, v]) => ({ canal, consultas: v.total, inscriptos: v.enrolled }))
      .sort((a, b) => b.consultas - a.consultas),
  };
}

export const getQualityAnalytics = unstable_cache(loadQuality, ["analytics-quality"], { revalidate: CACHE_SECONDS, tags: [ANALYTICS_TAG] });

