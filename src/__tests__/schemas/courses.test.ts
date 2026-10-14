import { describe, it, expect } from "vitest";
import { createCourseSchema, updateCourseSchema } from "@/modules/courses/schemas";

const base = {
  name: "Inglés Intermedio",
  level: "intermediate",
  classDays: ["monday"],
  classTime: "18:00",
  classDurationMinutes: 90,
  maxCapacity: 15,
};

describe("createCourseSchema", () => {
  it("acepta un curso válido sin docente (SCRUM-236)", () => {
    expect(createCourseSchema.safeParse(base).success).toBe(true);
  });

  it('trata teacherId "" ("Sin asignar") como no informado', () => {
    const parsed = createCourseSchema.safeParse({ ...base, teacherId: "" });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.teacherId).toBeUndefined();
  });

  it("rechaza un teacherId que no es un UUID", () => {
    expect(createCourseSchema.safeParse({ ...base, teacherId: "abc" }).success).toBe(false);
  });

  it("rechaza un curso sin días", () => {
    expect(createCourseSchema.safeParse({ ...base, classDays: [] }).success).toBe(false);
  });
});

describe("updateCourseSchema", () => {
  it("acepta una edición parcial con teacherId vacío", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(updateCourseSchema.safeParse({ id, teacherId: "" }).success).toBe(true);
  });
});
