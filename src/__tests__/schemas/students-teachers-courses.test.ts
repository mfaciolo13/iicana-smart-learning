import { describe, it, expect } from "vitest";
import { createStudentSchema, updateStudentSchema } from "@/modules/students/schemas";
import { createTeacherSchema, updateTeacherSchema } from "@/modules/teachers/schemas";
import { createCourseSchema, updateCourseSchema } from "@/modules/courses/schemas";

// SCRUM-103: Tests unitarios — schemas Zod de alumnos, docentes y cursos

const UUID = "550e8400-e29b-41d4-a716-446655440000";

// ─── createStudentSchema ───────────────────────────────────────────────────

describe("createStudentSchema", () => {
  const valid = {
    email: "alumno@example.com",
    fullName: "Juan Pérez",
    dni: "1234567",
    birthDate: "2005-03-15",
  };

  it("acepta datos mínimos válidos", () => {
    expect(createStudentSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta todos los campos opcionales", () => {
    const full = {
      ...valid,
      phone: "3510000000",
      level: "intermediate" as const,
      placementTestScore: 65,
    };
    expect(createStudentSchema.safeParse(full).success).toBe(true);
  });

  it("rechaza email inválido", () => {
    expect(createStudentSchema.safeParse({ ...valid, email: "noesemail" }).success).toBe(false);
    expect(createStudentSchema.safeParse({ ...valid, email: "" }).success).toBe(false);
  });

  it("rechaza fullName menor a 2 caracteres", () => {
    expect(createStudentSchema.safeParse({ ...valid, fullName: "A" }).success).toBe(false);
    expect(createStudentSchema.safeParse({ ...valid, fullName: "" }).success).toBe(false);
  });

  it("acepta fullName de exactamente 2 caracteres", () => {
    expect(createStudentSchema.safeParse({ ...valid, fullName: "AB" }).success).toBe(true);
  });

  it("rechaza DNI con menos de 7 caracteres", () => {
    expect(createStudentSchema.safeParse({ ...valid, dni: "123456" }).success).toBe(false);
    expect(createStudentSchema.safeParse({ ...valid, dni: "" }).success).toBe(false);
  });

  it("rechaza DNI con más de 8 caracteres", () => {
    expect(createStudentSchema.safeParse({ ...valid, dni: "123456789" }).success).toBe(false);
  });

  it("acepta DNI de 7 y 8 dígitos", () => {
    expect(createStudentSchema.safeParse({ ...valid, dni: "1234567" }).success).toBe(true);
    expect(createStudentSchema.safeParse({ ...valid, dni: "12345678" }).success).toBe(true);
  });

  it("acepta todos los niveles de inglés", () => {
    const levels = [
      "beginner",
      "elementary",
      "pre_intermediate",
      "intermediate",
      "upper_intermediate",
      "advanced",
    ] as const;
    for (const level of levels) {
      expect(createStudentSchema.safeParse({ ...valid, level }).success).toBe(true);
    }
  });

  it("rechaza nivel no permitido", () => {
    expect(createStudentSchema.safeParse({ ...valid, level: "expert" }).success).toBe(false);
  });

  it("coerce placementTestScore de string a número", () => {
    const result = createStudentSchema.safeParse({ ...valid, placementTestScore: "72" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.placementTestScore).toBe(72);
  });

  it("rechaza placementTestScore fuera de rango 0-100", () => {
    expect(createStudentSchema.safeParse({ ...valid, placementTestScore: -1 }).success).toBe(false);
    expect(createStudentSchema.safeParse({ ...valid, placementTestScore: 101 }).success).toBe(false);
  });

  it("acepta placementTestScore en los límites exactos (0 y 100)", () => {
    expect(createStudentSchema.safeParse({ ...valid, placementTestScore: 0 }).success).toBe(true);
    expect(createStudentSchema.safeParse({ ...valid, placementTestScore: 100 }).success).toBe(true);
  });

  it("acepta phone opcional", () => {
    expect(createStudentSchema.safeParse({ ...valid, phone: "3510000000" }).success).toBe(true);
    expect(createStudentSchema.safeParse(valid).success).toBe(true);
  });
});

// ─── updateStudentSchema ───────────────────────────────────────────────────

describe("updateStudentSchema", () => {
  it("requiere id como UUID válido", () => {
    expect(updateStudentSchema.safeParse({ id: UUID }).success).toBe(true);
  });

  it("rechaza id que no es UUID", () => {
    expect(updateStudentSchema.safeParse({ id: "abc" }).success).toBe(false);
  });

  it("acepta todos los campos como opcionales (partial)", () => {
    expect(updateStudentSchema.safeParse({ id: UUID }).success).toBe(true);
    expect(updateStudentSchema.safeParse({ id: UUID, fullName: "María García" }).success).toBe(true);
  });

  it("acepta todos los valores de status", () => {
    const statuses = ["active", "inactive", "suspended", "graduated"] as const;
    for (const status of statuses) {
      expect(updateStudentSchema.safeParse({ id: UUID, status }).success).toBe(true);
    }
  });

  it("rechaza status no permitido", () => {
    expect(updateStudentSchema.safeParse({ id: UUID, status: "deleted" }).success).toBe(false);
  });
});

// ─── createTeacherSchema ───────────────────────────────────────────────────

describe("createTeacherSchema", () => {
  const valid = {
    email: "docente@example.com",
    fullName: "Ana López",
    dni: "2345678",
  };

  it("acepta datos mínimos válidos", () => {
    expect(createTeacherSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta especialización opcional", () => {
    expect(createTeacherSchema.safeParse({ ...valid, specialization: "Cambridge CELTA" }).success).toBe(true);
    expect(createTeacherSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta phone opcional", () => {
    expect(createTeacherSchema.safeParse({ ...valid, phone: "3511234567" }).success).toBe(true);
    expect(createTeacherSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza email inválido", () => {
    expect(createTeacherSchema.safeParse({ ...valid, email: "noemail" }).success).toBe(false);
  });

  it("rechaza fullName menor a 2 caracteres", () => {
    expect(createTeacherSchema.safeParse({ ...valid, fullName: "X" }).success).toBe(false);
  });

  it("rechaza DNI con menos de 7 caracteres", () => {
    expect(createTeacherSchema.safeParse({ ...valid, dni: "123456" }).success).toBe(false);
  });

  it("rechaza DNI con más de 8 caracteres", () => {
    expect(createTeacherSchema.safeParse({ ...valid, dni: "123456789" }).success).toBe(false);
  });

  it("acepta DNI de 7 y 8 dígitos", () => {
    expect(createTeacherSchema.safeParse({ ...valid, dni: "2345678" }).success).toBe(true);
    expect(createTeacherSchema.safeParse({ ...valid, dni: "23456789" }).success).toBe(true);
  });
});

// ─── updateTeacherSchema ───────────────────────────────────────────────────

describe("updateTeacherSchema", () => {
  it("requiere id como UUID válido", () => {
    expect(updateTeacherSchema.safeParse({ id: UUID }).success).toBe(true);
  });

  it("rechaza id que no es UUID", () => {
    expect(updateTeacherSchema.safeParse({ id: "no-uuid" }).success).toBe(false);
  });

  it("todos los demás campos son opcionales (partial)", () => {
    expect(updateTeacherSchema.safeParse({ id: UUID, specialization: "IELTS" }).success).toBe(true);
    expect(updateTeacherSchema.safeParse({ id: UUID }).success).toBe(true);
  });
});

// ─── createCourseSchema ────────────────────────────────────────────────────

describe("createCourseSchema", () => {
  const valid = {
    name: "Inglés Intermedio A",
    level: "intermediate" as const,
    classDays: ["monday", "wednesday"] as const,
    classTime: "18:00",
    classDurationMinutes: 90,
  };

  it("acepta datos mínimos válidos", () => {
    expect(createCourseSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta todos los campos opcionales", () => {
    const full = {
      ...valid,
      classroom: "Aula 3",
      maxCapacity: 12,
      teacherId: UUID,
    };
    expect(createCourseSchema.safeParse(full).success).toBe(true);
  });

  it("rechaza name menor a 2 caracteres", () => {
    expect(createCourseSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("acepta todos los niveles de inglés", () => {
    const levels = [
      "beginner",
      "elementary",
      "pre_intermediate",
      "intermediate",
      "upper_intermediate",
      "advanced",
    ] as const;
    for (const level of levels) {
      expect(createCourseSchema.safeParse({ ...valid, level }).success).toBe(true);
    }
  });

  it("rechaza level no permitido", () => {
    expect(createCourseSchema.safeParse({ ...valid, level: "native" }).success).toBe(false);
  });

  it("rechaza classDays vacío", () => {
    expect(createCourseSchema.safeParse({ ...valid, classDays: [] }).success).toBe(false);
  });

  it("rechaza classTime con formato inválido", () => {
    expect(createCourseSchema.safeParse({ ...valid, classTime: "25:00" }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...valid, classTime: "8:00" }).success).toBe(false);
  });

  it("classDurationMinutes tiene default 90", () => {
    const { classDurationMinutes: _omit, ...withoutDuration } = valid;
    const result = createCourseSchema.safeParse(withoutDuration);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.classDurationMinutes).toBe(90);
  });

  it("maxCapacity tiene default 15", () => {
    const result = createCourseSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.maxCapacity).toBe(15);
  });

  it("coerce maxCapacity de string a número", () => {
    const result = createCourseSchema.safeParse({ ...valid, maxCapacity: "12" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.maxCapacity).toBe(12);
  });

  it("rechaza maxCapacity fuera de rango 1-15", () => {
    expect(createCourseSchema.safeParse({ ...valid, maxCapacity: 0 }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...valid, maxCapacity: 16 }).success).toBe(false);
  });

  it("acepta maxCapacity en los límites exactos (1 y 15)", () => {
    expect(createCourseSchema.safeParse({ ...valid, maxCapacity: 1 }).success).toBe(true);
    expect(createCourseSchema.safeParse({ ...valid, maxCapacity: 15 }).success).toBe(true);
  });

  it("acepta teacherId UUID válido", () => {
    expect(createCourseSchema.safeParse({ ...valid, teacherId: UUID }).success).toBe(true);
  });

  it("rechaza teacherId que no es UUID", () => {
    expect(createCourseSchema.safeParse({ ...valid, teacherId: "no-uuid" }).success).toBe(false);
  });

  it("acepta omitir teacherId (es opcional)", () => {
    expect(createCourseSchema.safeParse(valid).success).toBe(true);
  });
});

// ─── updateCourseSchema ────────────────────────────────────────────────────

describe("updateCourseSchema", () => {
  it("requiere id como UUID válido", () => {
    expect(updateCourseSchema.safeParse({ id: UUID }).success).toBe(true);
  });

  it("rechaza id que no es UUID", () => {
    expect(updateCourseSchema.safeParse({ id: "abc" }).success).toBe(false);
  });

  it("todos los demás campos son opcionales (partial)", () => {
    expect(updateCourseSchema.safeParse({ id: UUID, name: "Nuevo nombre" }).success).toBe(true);
    expect(updateCourseSchema.safeParse({ id: UUID }).success).toBe(true);
  });

  it("acepta todos los valores de status", () => {
    const statuses = ["active", "inactive", "completed"] as const;
    for (const status of statuses) {
      expect(updateCourseSchema.safeParse({ id: UUID, status }).success).toBe(true);
    }
  });

  it("rechaza status no permitido", () => {
    expect(updateCourseSchema.safeParse({ id: UUID, status: "archived" }).success).toBe(false);
  });
});
