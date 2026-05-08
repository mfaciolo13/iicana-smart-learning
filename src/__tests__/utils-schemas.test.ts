import { describe, it, expect } from "vitest";
import { cn } from "@/lib/cn";
import { sendNotificationSchema } from "@/modules/notifications/schemas";
import { createComplaintSchema } from "@/modules/complaints/schemas";
import { surveySchema } from "@/modules/teacher-evaluations/schemas";
import { generateAssessmentSchema, submitAttemptSchema } from "@/modules/assessments/schemas";

// SCRUM-107: Tests unitarios — utilidades compartidas y schemas restantes

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("cn() — merge de clases Tailwind", () => {
  it("combina clases simples", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("resuelve conflictos de Tailwind (tailwind-merge)", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("ignora valores falsy", () => {
    expect(cn("px-4", false, undefined, null, "py-2")).toBe("px-4 py-2");
  });

  it("acepta objetos condicionales", () => {
    expect(cn({ "px-4": true, "py-2": false })).toBe("px-4");
  });

  it("retorna string vacío sin argumentos", () => {
    expect(cn()).toBe("");
  });
});

describe("sendNotificationSchema", () => {
  const valid = {
    targetId: UUID,
    type: "general" as const,
    title: "Aviso importante",
    body: "Recordatorio de pago",
  };

  it("acepta datos válidos", () => {
    expect(sendNotificationSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta targetId en formato role:alumno", () => {
    expect(sendNotificationSchema.safeParse({ ...valid, targetId: "role:alumno" }).success).toBe(true);
  });

  it("acepta targetId en formato course:<uuid>", () => {
    expect(sendNotificationSchema.safeParse({ ...valid, targetId: `course:${UUID}` }).success).toBe(true);
  });

  it("rechaza targetId vacío", () => {
    expect(sendNotificationSchema.safeParse({ ...valid, targetId: "" }).success).toBe(false);
  });

  it("acepta todos los tipos de notificación", () => {
    const tipos = ["absence", "payment", "grade", "general", "alert"] as const;
    for (const type of tipos) {
      expect(sendNotificationSchema.safeParse({ ...valid, type }).success).toBe(true);
    }
  });
});

describe("createComplaintSchema", () => {
  const valid = {
    type: "academic" as const,
    description: "Esta es una descripción válida con más de 20 caracteres.",
  };

  it("acepta descripción entre 20 y 1000 caracteres", () => {
    expect(createComplaintSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza descripción menor a 20 caracteres", () => {
    const result = createComplaintSchema.safeParse({ ...valid, description: "Muy corta" });
    expect(result.success).toBe(false);
  });

  it("rechaza descripción mayor a 1000 caracteres", () => {
    const result = createComplaintSchema.safeParse({ ...valid, description: "a".repeat(1001) });
    expect(result.success).toBe(false);
  });

  it("acepta todos los tipos de reclamo", () => {
    const tipos = ["academic", "administrative", "infrastructure", "teacher"] as const;
    for (const type of tipos) {
      expect(createComplaintSchema.safeParse({ ...valid, type }).success).toBe(true);
    }
  });
});

describe("surveySchema", () => {
  const valid = {
    teacherId: UUID,
    courseId: UUID,
    rating1: 4,
    rating2: 5,
    rating3: 3,
    rating4: 4,
  };

  it("acepta ratings del 1 al 5", () => {
    expect(surveySchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza rating 0", () => {
    expect(surveySchema.safeParse({ ...valid, rating1: 0 }).success).toBe(false);
  });

  it("rechaza rating 6", () => {
    expect(surveySchema.safeParse({ ...valid, rating4: 6 }).success).toBe(false);
  });

  it("acepta enrollmentId opcional", () => {
    expect(surveySchema.safeParse({ ...valid, enrollmentId: UUID }).success).toBe(true);
    expect(surveySchema.safeParse({ ...valid }).success).toBe(true);
  });
});

describe("generateAssessmentSchema", () => {
  const valid = { courseId: UUID, weekLabel: "Semana 3", topic: "Present Perfect" };

  it("acepta datos válidos", () => {
    expect(generateAssessmentSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza topic menor a 5 caracteres", () => {
    expect(generateAssessmentSchema.safeParse({ ...valid, topic: "ab" }).success).toBe(false);
  });

  it("rechaza topic mayor a 300 caracteres", () => {
    expect(generateAssessmentSchema.safeParse({ ...valid, topic: "a".repeat(301) }).success).toBe(false);
  });
});

describe("submitAttemptSchema", () => {
  const valid = { assessmentId: UUID, answers: [0, 1, 2] };

  it("acepta respuestas válidas", () => {
    expect(submitAttemptSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza array vacío de respuestas", () => {
    expect(submitAttemptSchema.safeParse({ ...valid, answers: [] }).success).toBe(false);
  });

  it("rechaza índice negativo", () => {
    expect(submitAttemptSchema.safeParse({ ...valid, answers: [-1, 0] }).success).toBe(false);
  });

  it("acepta una sola respuesta", () => {
    expect(submitAttemptSchema.safeParse({ ...valid, answers: [0] }).success).toBe(true);
  });
});
