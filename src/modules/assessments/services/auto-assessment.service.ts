import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/drizzle";
import {
  assessments,
  courses,
  enrollments,
  students,
  profiles,
  teachers,
  attendance,
} from "@/lib/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { LEVEL_LABELS } from "@/lib/level-labels";
import type { QuizQuestion } from "../types";
import { parseQuestions, AI_TIMEOUT_MS, AI_MAX_TOKENS } from "../lib/questions";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function checkAndTriggerDiagnosticAssessment(courseId: string): Promise<boolean> {
  // Get course config
  const [course] = await db
    .select({
      id: courses.id,
      name: courses.name,
      level: courses.level,
      diagnosticFrequency: courses.diagnosticFrequency,
      teacherId: courses.teacherId,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course || course.diagnosticFrequency <= 0) return false;

  // Count total unique class dates for this course
  const [{ totalClasses }] = await db
    .select({ totalClasses: sql<number>`cast(count(distinct ${attendance.classDate}) as int)` })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .where(eq(enrollments.courseId, courseId));

  if (totalClasses === 0 || totalClasses % course.diagnosticFrequency !== 0) return false;

  // Get teacher profile for createdBy
  let teacherProfileId: string | null = null;
  if (course.teacherId) {
    const [teacher] = await db
      .select({ profileId: teachers.profileId })
      .from(teachers)
      .where(eq(teachers.id, course.teacherId))
      .limit(1);
    teacherProfileId = teacher?.profileId ?? null;
  }

  // If no teacher, try any director profile
  if (!teacherProfileId) {
    const [dir] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.role, "director"))
      .limit(1);
    teacherProfileId = dir?.id ?? null;
  }

  if (!teacherProfileId) return false;

  const levelLabel = LEVEL_LABELS[course.level] ?? course.level;
  const weekLabel = `Clase ${totalClasses} — Diagnóstico automático`;
  const topic = `Repaso acumulativo — ${levelLabel}`;

  const prompt = `Sos un profesor experto de inglés en Argentina.
Generá exactamente 10 preguntas de opción múltiple para una autoevaluación diagnóstica de alumnos de inglés nivel ${levelLabel}.
Este es un diagnóstico periódico luego de ${totalClasses} clases.

IMPORTANTE:
- Evaluá comprensión general del nivel, no de temas específicos.
- Las preguntas pueden estar en español o inglés según corresponda al nivel.
- Cada pregunta debe tener exactamente 4 opciones (A, B, C, D).
- El campo "correct" es el índice (0=A, 1=B, 2=C, 3=D) de la respuesta correcta.
- El campo "explanation" es una breve explicación en español (1-2 oraciones).
- Variá los tipos: completar oraciones, elegir la forma correcta, vocabulario, etc.

Respondé ÚNICAMENTE con un array JSON válido, sin texto adicional:
[
  {
    "question": "texto de la pregunta",
    "options": ["opción A", "opción B", "opción C", "opción D"],
    "correct": 0,
    "explanation": "explicación"
  }
]`;

  let questions: QuizQuestion[];
  try {
    const message = await client.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: AI_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      },
      { timeout: AI_TIMEOUT_MS }
    );
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const result = parseQuestions(text);
    if (!result.ok) {
      console.error("[auto-assessment] respuesta inválida del modelo:", result.error);
      return false;
    }
    questions = result.questions;
  } catch (err) {
    console.error("[auto-assessment] AI generation failed:", err);
    return false;
  }

  // Create and publish the assessment
  const [assessment] = await db
    .insert(assessments)
    .values({
      courseId,
      createdBy: teacherProfileId,
      weekLabel,
      topic,
      status: "published",
      questions: questions as unknown as typeof assessments.$inferInsert["questions"],
    })
    .returning();

  // Notify enrolled students
  const studentRows = await db
    .select({ email: profiles.email, fullName: profiles.fullName })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "active")));

  const { sendAssessmentPublishedEmail } = await import("@/lib/email");
  for (const s of studentRows) {
    try {
      await sendAssessmentPublishedEmail({
        to: s.email,
        fullName: s.fullName,
        courseName: course.name,
        topic,
        weekLabel,
      });
    } catch (err) {
      console.error(`[auto-assessment] failed email for ${s.email}:`, err);
    }
  }

  console.log(`[auto-assessment] created assessment ${assessment.id} for course ${courseId} at class ${totalClasses}`);
  return true;
}
