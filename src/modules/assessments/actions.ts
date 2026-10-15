"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import { requireRole, getCurrentUser } from "@/lib/auth/helpers";
import { assertCourseAccess } from "@/lib/auth/course-access";
import { isStudentAccessRestricted } from "@/modules/students/services/students.service";
import { sendAssessmentPublishedEmail } from "@/lib/email";
import { getEmailsForCourse } from "@/modules/notifications/services/notifications.service";
import { createServiceClient } from "@/lib/supabase/service";
import { getDocumentById } from "@/modules/documents/services/documents.service";
import {
  generateAssessmentSchema,
  publishAssessmentSchema,
  submitAttemptSchema,
} from "./schemas";
import {
  createAssessmentDraft,
  publishAssessment,
  archiveAssessment,
  submitAttempt,
  getAssessmentDetail,
  isStudentEnrolledInCourse,
  hasAttempt,
  countAssessmentsToday,
} from "./services/assessments.service";
import { parseQuestions, isTimeoutError, AI_TIMEOUT_MS, AI_MAX_TOKENS, MAX_AI_ASSESSMENTS_PER_COURSE_PER_DAY } from "./lib/questions";
import type { QuizQuestion, AnswerFeedback } from "./types";
import type { ActionResult } from "@/lib/action-result";
import { refreshAnalytics } from "@/lib/analytics-cache";

// MIME types supported by Claude's API
const CLAUDE_PDF_MIME = "application/pdf";
const CLAUDE_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);

async function buildDocumentContent(documentIds: string[]): Promise<Anthropic.Messages.ContentBlockParam[]> {
  if (documentIds.length === 0) return [];

  const supabase = createServiceClient();
  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

  for (const id of documentIds) {
    const doc = await getDocumentById(id);
    if (!doc) continue;

    // Skip formats Claude cannot process
    const isPdf = doc.mimeType === CLAUDE_PDF_MIME;
    const isImage = CLAUDE_IMAGE_MIMES.has(doc.mimeType);
    if (!isPdf && !isImage) continue;

    try {
      const { data: fileData, error } = await supabase.storage
        .from("documents")
        .download(doc.filePath);
      if (error || !fileData) continue;

      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      if (isPdf) {
        contentBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
          title: doc.name,
        } satisfies Anthropic.Messages.DocumentBlockParam);
      } else {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: doc.mimeType as "image/png" | "image/jpeg" | "image/webp",
            data: base64,
          },
        } satisfies Anthropic.Messages.ImageBlockParam);
      }
    } catch {
      // Silently skip documents that fail to download
      continue;
    }
  }

  return contentBlocks;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateAssessmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  const raw = {
    courseId: formData.get("courseId") as string,
    weekLabel: formData.get("weekLabel") as string,
    topic: formData.get("topic") as string,
    documentIds: (formData.get("documentIds") as string) || "",
  };

  const parsed = generateAssessmentSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat)
          .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          .filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  if ((await countAssessmentsToday(parsed.data.courseId)) >= MAX_AI_ASSESSMENTS_PER_COURSE_PER_DAY) {
    return { error: `Se alcanzó el límite de ${MAX_AI_ASSESSMENTS_PER_COURSE_PER_DAY} autoevaluaciones por curso por día.` };
  }

  const prompt = `Sos un profesor experto de inglés en Argentina.
Generá exactamente 10 preguntas de opción múltiple para una autoevaluación semanal de alumnos de inglés.
Tema de la semana: "${parsed.data.topic}"
Semana: "${parsed.data.weekLabel}"

IMPORTANTE:
- Las instrucciones/preguntas pueden estar en español o inglés según corresponda al nivel.
- Cada pregunta debe tener exactamente 4 opciones (A, B, C, D).
- El campo "correct" es el índice (0=A, 1=B, 2=C, 3=D) de la respuesta correcta.
- El campo "explanation" es una breve explicación en español de por qué esa es la respuesta correcta (1-2 oraciones).
- Variá los tipos: completar oraciones, elegir la forma correcta del verbo, vocabulario, comprensión, etc.
- Hacé las preguntas interesantes y relevantes al tema.
${raw.documentIds ? "- Usá los documentos adjuntos como contexto adicional para generar preguntas más específicas y relevantes al material de la clase." : ""}

Respondé ÚNICAMENTE con un array JSON válido, sin texto adicional, con este formato exacto:
[
  {
    "question": "texto de la pregunta",
    "options": ["opción A", "opción B", "opción C", "opción D"],
    "correct": 0,
    "explanation": "explicación de por qué esta opción es correcta"
  }
]`;

  let questions: QuizQuestion[];

  try {
    const docIds = raw.documentIds
      ? raw.documentIds.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const docBlocks = await buildDocumentContent(docIds);

    const userContent: Anthropic.Messages.ContentBlockParam[] = [
      ...docBlocks,
      { type: "text", text: prompt },
    ];

    const message = await client.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: AI_MAX_TOKENS,
        messages: [{ role: "user", content: userContent }],
      },
      { timeout: AI_TIMEOUT_MS }
    );

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const result = parseQuestions(text);
    if (!result.ok) return { error: result.error };
    questions = result.questions;
  } catch (e) {
    return {
      error: isTimeoutError(e)
        ? "La generación tardó demasiado. Intentá de nuevo en unos minutos."
        : "Error al conectar con el modelo de IA. Verificá tu conexión.",
    };
  }

  const assessment = await createAssessmentDraft(parsed.data, user.id, questions);

  refreshAnalytics();
  revalidatePath("/director/assessments");
  redirect(`/director/assessments/${assessment.id}`);
}

export async function publishAssessmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const parsed = publishAssessmentSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const assessment = await publishAssessment(parsed.data.id);
  const detail = await getAssessmentDetail(parsed.data.id);

  if (detail) {
    try {
      const recipients = await getEmailsForCourse(assessment.courseId);
      await Promise.all(
        recipients.map((r) =>
          sendAssessmentPublishedEmail({
            to: r.email,
            fullName: r.fullName,
            courseName: detail.courseName,
            topic: detail.topic,
            weekLabel: detail.weekLabel,
          })
        )
      );
    } catch (e) {
      console.error("[assessment published email]", e);
    }
  }

  refreshAnalytics();
  revalidatePath("/director/assessments");
  revalidatePath(`/director/assessments/${parsed.data.id}`);
  redirect(`/director/assessments/${parsed.data.id}`);
}

export async function archiveAssessmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await archiveAssessment(id);

  refreshAnalytics();
  revalidatePath("/director/assessments");
  revalidatePath(`/director/assessments/${id}`);
  redirect(`/director/assessments/${id}`);
}

export async function generateAssessmentProfesorAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["profesor"]);
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  const raw = {
    courseId: formData.get("courseId") as string,
    weekLabel: formData.get("weekLabel") as string,
    topic: formData.get("topic") as string,
    documentIds: (formData.get("documentIds") as string) || "",
  };

  const parsed = generateAssessmentSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat)
          .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          .filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  await assertCourseAccess(role, parsed.data.courseId);

  if ((await countAssessmentsToday(parsed.data.courseId)) >= MAX_AI_ASSESSMENTS_PER_COURSE_PER_DAY) {
    return { error: `Se alcanzó el límite de ${MAX_AI_ASSESSMENTS_PER_COURSE_PER_DAY} autoevaluaciones por curso por día.` };
  }

  const prompt = `Sos un profesor experto de inglés en Argentina.
Generá exactamente 10 preguntas de opción múltiple para una autoevaluación semanal de alumnos de inglés.
Tema de la semana: "${parsed.data.topic}"
Semana: "${parsed.data.weekLabel}"

IMPORTANTE:
- Las instrucciones/preguntas pueden estar en español o inglés según corresponda al nivel.
- Cada pregunta debe tener exactamente 4 opciones (A, B, C, D).
- El campo "correct" es el índice (0=A, 1=B, 2=C, 3=D) de la respuesta correcta.
- El campo "explanation" es una breve explicación en español de por qué esa es la respuesta correcta (1-2 oraciones).
- Variá los tipos: completar oraciones, elegir la forma correcta del verbo, vocabulario, comprensión, etc.
- Hacé las preguntas interesantes y relevantes al tema.
${raw.documentIds ? "- Usá los documentos adjuntos como contexto adicional para generar preguntas más específicas y relevantes al material de la clase." : ""}

Respondé ÚNICAMENTE con un array JSON válido, sin texto adicional, con este formato exacto:
[
  {
    "question": "texto de la pregunta",
    "options": ["opción A", "opción B", "opción C", "opción D"],
    "correct": 0,
    "explanation": "explicación de por qué esta opción es correcta"
  }
]`;

  let questions: QuizQuestion[];

  try {
    const docIds = raw.documentIds
      ? raw.documentIds.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const docBlocks = await buildDocumentContent(docIds);

    const userContent: Anthropic.Messages.ContentBlockParam[] = [
      ...docBlocks,
      { type: "text", text: prompt },
    ];

    const message = await client.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: AI_MAX_TOKENS,
        messages: [{ role: "user", content: userContent }],
      },
      { timeout: AI_TIMEOUT_MS }
    );

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const result = parseQuestions(text);
    if (!result.ok) return { error: result.error };
    questions = result.questions;
  } catch (e) {
    return {
      error: isTimeoutError(e)
        ? "La generación tardó demasiado. Intentá de nuevo en unos minutos."
        : "Error al conectar con el modelo de IA. Verificá tu conexión.",
    };
  }

  const assessment = await createAssessmentDraft(parsed.data, user.id, questions);

  refreshAnalytics();
  revalidatePath("/profesor/assessments");
  redirect(`/profesor/assessments/${assessment.id}`);
}

export async function publishAssessmentProfesorAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "profesor"]);

  const parsed = publishAssessmentSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const target = await getAssessmentDetail(parsed.data.id);
  if (!target) return { error: "Evaluación no encontrada" };
  await assertCourseAccess(role, target.courseId);

  const assessment = await publishAssessment(parsed.data.id);
  const detail = await getAssessmentDetail(parsed.data.id);

  if (detail) {
    try {
      const recipients = await getEmailsForCourse(assessment.courseId);
      await Promise.all(
        recipients.map((r) =>
          sendAssessmentPublishedEmail({
            to: r.email,
            fullName: r.fullName,
            courseName: detail.courseName,
            topic: detail.topic,
            weekLabel: detail.weekLabel,
          })
        )
      );
    } catch (e) {
      console.error("[assessment published email]", e);
    }
  }

  refreshAnalytics();
  revalidatePath("/profesor/assessments");
  revalidatePath(`/profesor/assessments/${parsed.data.id}`);
  redirect(`/profesor/assessments/${parsed.data.id}`);
}

export async function archiveAssessmentProfesorAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "profesor"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  const target = await getAssessmentDetail(id);
  if (!target) return { error: "Evaluación no encontrada" };
  await assertCourseAccess(role, target.courseId);

  await archiveAssessment(id);

  refreshAnalytics();
  revalidatePath("/profesor/assessments");
  revalidatePath(`/profesor/assessments/${id}`);
  redirect(`/profesor/assessments/${id}`);
}

/**
 * Corrige UNA respuesta en el servidor y devuelve el feedback (correcta, explicación). El payload
 * inicial del quiz ya no trae las respuestas (SCRUM-301): el alumno las conoce sólo después de
 * responder cada pregunta.
 */
export async function checkAnswerAction(
  assessmentId: string,
  questionIndex: number,
  chosenIndex: number
): Promise<{ error: string } | AnswerFeedback> {
  await requireRole(["alumno"]);
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  if (await isStudentAccessRestricted(user.id)) return { error: "Tu acceso está restringido por cuotas impagas. Regularizá tus pagos con la administración." };

  if (!Number.isInteger(questionIndex) || !Number.isInteger(chosenIndex) || chosenIndex < 0) {
    return { error: "Respuesta inválida" };
  }

  const detail = await getAssessmentDetail(assessmentId);
  if (!detail || detail.status !== "published") return { error: "Evaluación no disponible" };
  if (!(await isStudentEnrolledInCourse(user.id, detail.courseId))) return { error: "Evaluación no disponible" };
  if (await hasAttempt(assessmentId, user.id)) return { error: "Ya respondiste esta autoevaluación" };

  const question = (detail.questions as unknown as QuizQuestion[])[questionIndex];
  if (!question || chosenIndex >= question.options.length) return { error: "Respuesta inválida" };

  return {
    correct: chosenIndex === question.correct,
    correctIndex: question.correct,
    explanation: question.explanation,
  };
}

export async function submitAttemptAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["alumno"]);
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  const answersRaw = formData.get("answers") as string;
  let answers: number[];
  try {
    answers = JSON.parse(answersRaw);
  } catch {
    return { error: "Respuestas inválidas" };
  }

  const parsed = submitAttemptSchema.safeParse({
    assessmentId: formData.get("assessmentId"),
    answers,
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat)
          .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          .filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  if (await isStudentAccessRestricted(user.id)) return { error: "Tu acceso está restringido por cuotas impagas. Regularizá tus pagos con la administración." };

  const detail = await getAssessmentDetail(parsed.data.assessmentId);
  if (!detail || detail.status !== "published") return { error: "Evaluación no disponible" };
  // Sólo alumnos inscriptos en el curso, y una sola vez por autoevaluación (SCRUM-251).
  if (!(await isStudentEnrolledInCourse(user.id, detail.courseId))) return { error: "Evaluación no disponible" };
  if (await hasAttempt(parsed.data.assessmentId, user.id)) return { error: "Ya respondiste esta autoevaluación" };

  await submitAttempt(parsed.data, user.id, detail.questions);

  refreshAnalytics();
  revalidatePath("/alumno/assessments");
  redirect(`/alumno/assessments/${parsed.data.assessmentId}/resultado`);
}
