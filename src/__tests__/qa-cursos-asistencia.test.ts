import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRealIsoDate, validateClassDate, weekdayOf } from "@/lib/class-date";
import { parseSchedule, schedulesOverlap } from "@/modules/courses/lib/overlap";
import { createCourseSchema } from "@/modules/courses/schemas";
import { formatSchedule } from "@/modules/courses/lib/schedule";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("fecha de la toma de lista", () => {
  const now = new Date("2026-11-05T15:00:00Z"); // jueves 5/11 en Córdoba

  it("acepta una fecha real, pasada y de un día de cursada", () => {
    expect(validateClassDate("2026-11-04", ["monday", "wednesday"], now)).toBeNull();
    expect(validateClassDate("2026-11-05", ["thursday"], now)).toBeNull();
  });

  it("rechaza formatos raros y fechas inexistentes (antes pasaban la guarda de fecha futura)", () => {
    for (const bad of ["20991231", "2099-12-31x", "31/12/2026", "2026-02-30", "ayer", "", null, undefined]) {
      expect(validateClassDate(bad, undefined, now)).toBe("La fecha de la clase no es válida");
    }
  });

  it("rechaza fechas futuras, incluso en 2099", () => {
    expect(validateClassDate("2099-12-31", undefined, now)).toMatch(/futura/);
    expect(validateClassDate("2026-11-06", undefined, now)).toMatch(/futura/);
  });

  it("rechaza un día que no es de cursada", () => {
    // Curso de lunes y miércoles: el sábado 31/10 no hay clase.
    expect(validateClassDate("2026-10-31", ["monday", "wednesday"], now)).toMatch(/no es de cursada/);
  });

  it("calcula el día de la semana sin corrimientos de zona horaria", () => {
    expect(weekdayOf("2026-11-05")).toBe("thursday");
    expect(weekdayOf("2026-11-01")).toBe("sunday");
    expect(isRealIsoDate("2024-02-29")).toBe(true);
    expect(isRealIsoDate("2026-02-29")).toBe(false);
  });

  it("las tres operaciones de asistencia validan la fecha y la acción de alta usa lo realmente insertado", () => {
    const src = read("src/modules/attendance/actions.ts");
    expect(src.match(/validateClassDate\(/g)?.length).toBe(2);
    expect(src).toContain("isRealIsoDate(classDate)");
    expect(src).toContain("inserted.has(r.enrollmentId)");
  });
});

describe("superposición de horarios", () => {
  it("detecta el choque simple", () => {
    expect(schedulesOverlap("Lun/Mié 18:00–19:30", "Mié 19:00–20:30")).toBe(true);
    expect(schedulesOverlap("Lun/Mié 18:00–19:30", "Mié 19:30–21:00")).toBe(false);
    expect(schedulesOverlap("Lun 18:00–19:30", "Mar 18:00–19:30")).toBe(false);
  });

  it("detecta el choque de dos cursos que cruzan la medianoche", () => {
    expect(schedulesOverlap("Lun 23:00–02:00", "Lun 23:30–01:00")).toBe(true);
  });

  it("una clase que cruza la medianoche choca con la del día siguiente", () => {
    expect(schedulesOverlap("Lun 23:00–02:00", "Mar 01:00–02:30")).toBe(true);
    expect(schedulesOverlap("Lun 23:00–02:00", "Mar 02:00–03:00")).toBe(false);
  });

  it("empalma el domingo con el lunes", () => {
    expect(schedulesOverlap("Dom 23:00–01:00", "Lun 00:00–01:30")).toBe(true);
  });

  it("interpreta lo que genera formatSchedule", () => {
    const s = formatSchedule(["monday", "wednesday"], "23:00", 180);
    expect(s).toBe("Lun/Mié 23:00–02:00");
    expect(parseSchedule(s)).toEqual({ days: [0, 2], start: 1380, duration: 180 });
  });

  it("un horario que no se puede interpretar no inventa un choque", () => {
    expect(schedulesOverlap("sin horario", "Lun 18:00–19:00")).toBe(false);
  });

  it("cambiar el horario de un curso revalida las superposiciones de sus alumnos", () => {
    const src = read("src/modules/courses/actions.ts");
    expect(src).toContain("findScheduleConflictsForCourse");
    expect(read("src/modules/enrollments/services/enrollments.service.ts")).toContain('from "@/modules/courses/lib/overlap"');
  });
});

describe("validación de cursos", () => {
  const base = { name: "Inglés A", level: "beginner", classDays: ["monday"], classTime: "18:00", classDurationMinutes: 90, maxCapacity: 15 };

  it("rechaza domingos en el servidor", () => {
    const r = createCourseSchema.safeParse({ ...base, classDays: ["sunday"] });
    expect(r.success).toBe(false);
  });

  it("limita el largo del nombre", () => {
    expect(createCourseSchema.safeParse({ ...base, name: "x".repeat(101) }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...base, name: "x".repeat(100) }).success).toBe(true);
  });

  it("un cupo que no es número muestra un mensaje en español", () => {
    const r = createCourseSchema.safeParse({ ...base, maxCapacity: "abc" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("El cupo debe ser un número");
  });

  it("editar un curso conserva la frecuencia de la autoevaluación diagnóstica", () => {
    const src = read("src/app/(dashboard)/director/courses/[id]/edit/page.tsx");
    expect(src).toContain("diagnostic_frequency");
    expect(src).not.toContain("diagnosticFrequency: 0,");
  });

  it("el cupo se verifica con la fila del curso bloqueada, en la misma transacción", () => {
    const src = read("src/modules/courses/services/courses.service.ts");
    expect(src).toContain("updateCourseChecked");
    expect(src).toMatch(/for\("update"\)/);
  });
});

describe("semáforo de asistencia del alumno", () => {
  it("usa el mínimo real de promoción (80 %), no 75 %", () => {
    expect(read("src/app/(dashboard)/alumno/attendance/page.tsx")).toContain("attendanceRate >= 80");
  });
});
