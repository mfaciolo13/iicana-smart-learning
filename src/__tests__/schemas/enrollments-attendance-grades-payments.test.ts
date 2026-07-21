import { describe, it, expect } from "vitest";
import { createEnrollmentSchema, updateEnrollmentSchema } from "@/modules/enrollments/schemas";
import { recordAttendanceSchema, attendanceStatusEnum } from "@/modules/attendance/schemas";
import { createGradeSchema } from "@/modules/grades/schemas";
import { createPaymentSchema, markAsPaidSchema, updatePaymentSchema, cancelPaymentSchema } from "@/modules/payments/schemas";

// SCRUM-104: Tests unitarios — schemas de inscripciones, asistencia, notas y pagos

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createEnrollmentSchema", () => {
  it("acepta UUIDs válidos", () => {
    expect(createEnrollmentSchema.safeParse({ studentId: UUID, courseId: UUID }).success).toBe(true);
  });

  it("rechaza studentId no UUID", () => {
    const result = createEnrollmentSchema.safeParse({ studentId: "abc", courseId: UUID });
    expect(result.success).toBe(false);
  });

  it("rechaza courseId no UUID", () => {
    const result = createEnrollmentSchema.safeParse({ studentId: UUID, courseId: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("updateEnrollmentSchema", () => {
  it("acepta status active", () => {
    expect(updateEnrollmentSchema.safeParse({ id: UUID, status: "active" }).success).toBe(true);
  });

  it("acepta status completed y withdrawn", () => {
    expect(updateEnrollmentSchema.safeParse({ id: UUID, status: "completed" }).success).toBe(true);
    expect(updateEnrollmentSchema.safeParse({ id: UUID, status: "withdrawn" }).success).toBe(true);
  });

  it("rechaza status inválido", () => {
    expect(updateEnrollmentSchema.safeParse({ id: UUID, status: "canceled" }).success).toBe(false);
  });
});

describe("recordAttendanceSchema", () => {
  const valid = { courseId: UUID, classDate: "2026-05-08", enrollmentIds: UUID };

  it("acepta datos válidos", () => {
    expect(recordAttendanceSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta enrollmentIds separados por coma", () => {
    const result = recordAttendanceSchema.safeParse({ ...valid, enrollmentIds: `${UUID},${UUID}` });
    expect(result.success).toBe(true);
  });

  it("rechaza classDate vacío", () => {
    expect(recordAttendanceSchema.safeParse({ ...valid, classDate: "" }).success).toBe(false);
  });

  it("rechaza enrollmentIds vacío", () => {
    expect(recordAttendanceSchema.safeParse({ ...valid, enrollmentIds: "" }).success).toBe(false);
  });
});

describe("attendanceStatusEnum", () => {
  it("acepta present, absent y late", () => {
    expect(attendanceStatusEnum.safeParse("present").success).toBe(true);
    expect(attendanceStatusEnum.safeParse("absent").success).toBe(true);
    expect(attendanceStatusEnum.safeParse("late").success).toBe(true);
  });

  it("rechaza valor inválido", () => {
    expect(attendanceStatusEnum.safeParse("missing").success).toBe(false);
  });
});

describe("createGradeSchema", () => {
  const valid = { enrollmentId: UUID, evaluationType: "parcial" as const, score: 7 };

  it("acepta nota entre 1 y 10", () => {
    expect(createGradeSchema.safeParse({ ...valid, score: 1 }).success).toBe(true);
    expect(createGradeSchema.safeParse({ ...valid, score: 10 }).success).toBe(true);
    expect(createGradeSchema.safeParse({ ...valid, score: 7.5 }).success).toBe(true);
  });

  it("rechaza nota menor a 1", () => {
    expect(createGradeSchema.safeParse({ ...valid, score: 0 }).success).toBe(false);
  });

  it("rechaza nota mayor a 10", () => {
    expect(createGradeSchema.safeParse({ ...valid, score: 11 }).success).toBe(false);
  });

  it("acepta todos los tipos de evaluación", () => {
    const tipos = ["parcial", "final", "oral", "homework", "quiz"] as const;
    for (const evaluationType of tipos) {
      expect(createGradeSchema.safeParse({ ...valid, evaluationType }).success).toBe(true);
    }
  });

  it("rechaza tipo de evaluación inválido", () => {
    expect(createGradeSchema.safeParse({ ...valid, evaluationType: "examen" }).success).toBe(false);
  });

  it("convierte string numérico a número (coerce)", () => {
    const result = createGradeSchema.safeParse({ ...valid, score: "8" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.score).toBe(8);
  });
});

describe("createPaymentSchema", () => {
  const valid = { studentId: UUID, amount: 5000, dueDate: "2026-06-10" };

  it("acepta datos válidos", () => {
    expect(createPaymentSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza monto cero", () => {
    expect(createPaymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it("rechaza monto negativo", () => {
    expect(createPaymentSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
  });

  it("rechaza dueDate vacío", () => {
    expect(createPaymentSchema.safeParse({ ...valid, dueDate: "" }).success).toBe(false);
  });
});

describe("markAsPaidSchema", () => {
  it("acepta cash, transfer y card", () => {
    expect(markAsPaidSchema.safeParse({ id: UUID, method: "cash" }).success).toBe(true);
    expect(markAsPaidSchema.safeParse({ id: UUID, method: "transfer" }).success).toBe(true);
    expect(markAsPaidSchema.safeParse({ id: UUID, method: "card" }).success).toBe(true);
  });

  it("rechaza método inválido", () => {
    expect(markAsPaidSchema.safeParse({ id: UUID, method: "crypto" }).success).toBe(false);
  });
});

// SCRUM-233: edición y anulación de pagos

describe("updatePaymentSchema", () => {
  const valid = { id: UUID, amount: 5000, dueDate: "2026-06-10" };

  it("acepta datos válidos sin studentId", () => {
    expect(updatePaymentSchema.safeParse(valid).success).toBe(true);
  });

  it("no requiere studentId — el pago no cambia de alumno al editarse", () => {
    const result = updatePaymentSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect("studentId" in result.data).toBe(false);
  });

  it("hereda las validaciones de monto de createPaymentSchema", () => {
    expect(updatePaymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(updatePaymentSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
  });

  it("rechaza id no UUID", () => {
    expect(updatePaymentSchema.safeParse({ ...valid, id: "abc" }).success).toBe(false);
  });
});

describe("cancelPaymentSchema", () => {
  it("acepta un motivo suficientemente explicativo", () => {
    const result = cancelPaymentSchema.safeParse({ id: UUID, reason: "Cuota duplicada por error de carga" });
    expect(result.success).toBe(true);
  });

  it("rechaza motivo vacío — la anulación debe quedar justificada", () => {
    expect(cancelPaymentSchema.safeParse({ id: UUID, reason: "" }).success).toBe(false);
  });

  it("rechaza motivo demasiado corto", () => {
    expect(cancelPaymentSchema.safeParse({ id: UUID, reason: "error" }).success).toBe(false);
  });

  it("rechaza motivo que solo tiene espacios", () => {
    expect(cancelPaymentSchema.safeParse({ id: UUID, reason: "              " }).success).toBe(false);
  });

  it("rechaza motivo de más de 500 caracteres", () => {
    expect(cancelPaymentSchema.safeParse({ id: UUID, reason: "a".repeat(501) }).success).toBe(false);
  });
});
