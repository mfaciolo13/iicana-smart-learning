import { describe, it, expect } from "vitest";
import { createStudentSchema } from "@/modules/students/schemas";
import { sendNotificationSchema } from "@/modules/notifications/schemas";
import { createGradeSchema } from "@/modules/grades/schemas";
import { createComplaintSchema } from "@/modules/complaints/schemas";
import { createCourseSchema } from "@/modules/courses/schemas";
import { surveySchema, observationSchema } from "@/modules/teacher-evaluations/schemas";
import { portalPath } from "@/lib/portal";

// Correcciones de la pasada de QA manual del 14/10/2026 (SCRUM-235, 241, 313, 348)

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("SCRUM-235: nivel vacío en el alta de alumno", () => {
  const base = { email: "a@example.com", fullName: "Ana Pérez", dni: "12345678", birthDate: "2005-03-15" };

  it('trata "" (Sin asignar) como sin nivel', () => {
    const r = createStudentSchema.safeParse({ ...base, level: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.level).toBeUndefined();
  });

  it("sigue aceptando un nivel válido", () => {
    expect(createStudentSchema.safeParse({ ...base, level: "beginner" }).success).toBe(true);
  });

  it("rechaza un nivel inexistente con mensaje en español", () => {
    const r = createStudentSchema.safeParse({ ...base, level: "expert" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Seleccioná un nivel válido");
  });
});

describe("SCRUM-241: destinatarios por rol", () => {
  const base = { type: "general", title: "Hola", body: "Mensaje" };

  it.each(["role:alumno", "role:profesor", "role:director", "role:administrativo"])("acepta %s", (targetId) => {
    expect(sendNotificationSchema.safeParse({ ...base, targetId }).success).toBe(true);
  });

  it("rechaza el rol obsoleto role:admin", () => {
    const r = sendNotificationSchema.safeParse({ ...base, targetId: "role:admin" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("El rol destinatario no es válido");
  });

  it("sigue aceptando curso y usuario individual", () => {
    expect(sendNotificationSchema.safeParse({ ...base, targetId: `course:${UUID}` }).success).toBe(true);
    expect(sendNotificationSchema.safeParse({ ...base, targetId: UUID }).success).toBe(true);
  });
});

describe("SCRUM-313: mensajes de validación en español", () => {
  const firstMessage = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0].message;

  it("nota sin elegir", () => {
    const r = createGradeSchema.safeParse({ enrollmentId: UUID, evaluationType: "parcial", score: undefined });
    expect(r.success).toBe(false);
    expect(firstMessage(r)).toBe("Elegí una nota del 1 al 10");
  });

  it("categoría de reclamo sin elegir", () => {
    const r = createComplaintSchema.safeParse({ type: "", description: "x".repeat(25) });
    expect(r.success).toBe(false);
    expect(firstMessage(r)).toBe("Seleccioná una categoría");
  });

  it("nivel de curso sin elegir", () => {
    const r = createCourseSchema.safeParse({ name: "Curso", level: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.message === "Seleccioná un nivel")).toBe(true);
  });

  it("evaluación docente sin calificar", () => {
    const r = surveySchema.safeParse({ teacherId: UUID, courseId: UUID, rating1: undefined, rating2: 5, rating3: 5, rating4: 5 });
    expect(r.success).toBe(false);
    expect(firstMessage(r)).toBe("Calificá de 1 a 5 estrellas");
  });

  it("observación de clase sin docente ni curso ni calificación", () => {
    const r = observationSchema.safeParse({ teacherId: "", courseId: "", observedAt: "2026-10-14", overallRating: undefined, observations: "x".repeat(12) });
    expect(r.success).toBe(false);
    const messages = r.error?.issues.map((i) => i.message) ?? [];
    expect(messages).toContain("Seleccioná un docente");
    expect(messages).toContain("Seleccioná un curso");
    expect(messages).toContain("Calificá de 1 a 5 estrellas");
  });
});

describe("SCRUM-348: prefijo de portal", () => {
  it("arma la ruta dentro del portal del rol", () => {
    expect(portalPath("director", "/students")).toBe("/director/students");
    expect(portalPath("administrativo", "/students")).toBe("/administrativo/students");
    expect(portalPath("profesor", "/grades")).toBe("/profesor/grades");
  });
});
