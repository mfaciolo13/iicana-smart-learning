"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import { requireRole, getCurrentUser } from "@/lib/auth/helpers";
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
} from "./services/assessments.service";
import type { QuizQuestion } from "./types";
import type { ActionResult } from "@/lib/action-result";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateAssessmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  const raw = {
    courseId: formData.get("courseId") as string,
    weekLabel: formData.get("weekLabel") as string,
    topic: formData.get("topic") as string,
  };

  const parsed = generateAssessmentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

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
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { error: "Error generando preguntas. Intentá de nuevo." };

    questions = JSON.parse(jsonMatch[0]) as QuizQuestion[];
    if (!Array.isArray(questions) || questions.length === 0) {
      return { error: "Respuesta inválida del modelo. Intentá de nuevo." };
    }
  } catch {
    return { error: "Error al conectar con el modelo de IA. Verificá tu conexión." };
  }

  const assessment = await createAssessmentDraft(parsed.data, user.id, questions);

  revalidatePath("/admin/assessments");
  redirect(`/admin/assessments/${assessment.id}`);
}

export async function publishAssessmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const parsed = publishAssessmentSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await publishAssessment(parsed.data.id);

  revalidatePath("/admin/assessments");
  revalidatePath(`/admin/assessments/${parsed.data.id}`);
  redirect(`/admin/assessments/${parsed.data.id}`);
}

export async function archiveAssessmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await archiveAssessment(id);

  revalidatePath("/admin/assessments");
  revalidatePath(`/admin/assessments/${id}`);
  redirect(`/admin/assessments/${id}`);
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
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const detail = await getAssessmentDetail(parsed.data.assessmentId);
  if (!detail || detail.status !== "published") return { error: "Evaluación no disponible" };

  await submitAttempt(parsed.data, user.id, detail.questions);

  revalidatePath("/alumno/assessments");
  redirect(`/alumno/assessments/${parsed.data.assessmentId}/resultado`);
}
