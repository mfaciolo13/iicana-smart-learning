import { describe, it, expect } from "vitest";
import {
  ATTENDANCE_THRESHOLD,
  GRADE_THRESHOLD,
} from "@/modules/promotions/services/promotions.service";

// SCRUM-105: Tests unitarios — reglas de negocio críticas

// Lógica de elegibilidad extraída del service (pura, sin DB)
function calcEligibility(attendancePct: number | null, gradeAvg: number | null) {
  const meetsAttendance = attendancePct !== null && attendancePct >= ATTENDANCE_THRESHOLD;
  const meetsGrades = gradeAvg !== null && gradeAvg >= GRADE_THRESHOLD;
  return meetsAttendance && meetsGrades;
}

// Lógica de outcome de fin de año (pura, sin DB)
function calcOutcome(
  enrollmentStatus: string,
  attendancePct: number | null,
  gradeAvg: number | null
): "promoted" | "eligible" | "insufficient" | "no_data" | "withdrawn" {
  if (enrollmentStatus === "withdrawn") return "withdrawn";
  if (enrollmentStatus === "completed") return "promoted";
  if (attendancePct === null && gradeAvg === null) return "no_data";
  const meetsAttendance = attendancePct !== null && attendancePct >= ATTENDANCE_THRESHOLD;
  const meetsGrades = gradeAvg !== null && gradeAvg >= GRADE_THRESHOLD;
  return meetsAttendance && meetsGrades ? "eligible" : "insufficient";
}

// Cálculo de porcentaje de asistencia
function calcAttendancePct(present: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((present / total) * 100);
}

describe("Umbrales de negocio", () => {
  it("ATTENDANCE_THRESHOLD es 80", () => {
    expect(ATTENDANCE_THRESHOLD).toBe(80);
  });

  it("GRADE_THRESHOLD es 7.0", () => {
    expect(GRADE_THRESHOLD).toBe(7.0);
  });
});

describe("Elegibilidad para promoción", () => {
  it("es elegible con asistencia ≥ 80% y nota ≥ 7", () => {
    expect(calcEligibility(80, 7.0)).toBe(true);
    expect(calcEligibility(100, 10)).toBe(true);
    expect(calcEligibility(85, 8)).toBe(true);
  });

  it("no es elegible si asistencia es exactamente 79%", () => {
    expect(calcEligibility(79, 8)).toBe(false);
  });

  it("no es elegible si nota es exactamente 6.9", () => {
    expect(calcEligibility(85, 6.9)).toBe(false);
  });

  it("no es elegible si asistencia es null", () => {
    expect(calcEligibility(null, 8)).toBe(false);
  });

  it("no es elegible si nota es null", () => {
    expect(calcEligibility(80, null)).toBe(false);
  });

  it("no es elegible si ambos son null", () => {
    expect(calcEligibility(null, null)).toBe(false);
  });
});

describe("Cálculo de porcentaje de asistencia", () => {
  it("calcula correctamente con clases presentes", () => {
    expect(calcAttendancePct(8, 10)).toBe(80);
    expect(calcAttendancePct(10, 10)).toBe(100);
    expect(calcAttendancePct(0, 10)).toBe(0);
  });

  it("retorna null si no hay clases", () => {
    expect(calcAttendancePct(0, 0)).toBeNull();
  });

  it("redondea correctamente", () => {
    expect(calcAttendancePct(7, 9)).toBe(78); // 77.7... → 78
    expect(calcAttendancePct(2, 3)).toBe(67); // 66.6... → 67
  });
});

describe("Outcome de fin de año", () => {
  it("retorna 'withdrawn' si inscripción retirada", () => {
    expect(calcOutcome("withdrawn", 90, 8)).toBe("withdrawn");
    expect(calcOutcome("withdrawn", null, null)).toBe("withdrawn");
  });

  it("retorna 'promoted' si inscripción completada", () => {
    expect(calcOutcome("completed", 90, 8)).toBe("promoted");
  });

  it("retorna 'no_data' si no hay datos de asistencia ni notas", () => {
    expect(calcOutcome("active", null, null)).toBe("no_data");
  });

  it("retorna 'eligible' si cumple ambos umbrales", () => {
    expect(calcOutcome("active", 80, 7)).toBe("eligible");
  });

  it("retorna 'insufficient' si falta asistencia", () => {
    expect(calcOutcome("active", 50, 8)).toBe("insufficient");
  });

  it("retorna 'insufficient' si falta nota", () => {
    expect(calcOutcome("active", 90, 4)).toBe("insufficient");
  });

  it("retorna 'insufficient' si faltan ambos", () => {
    expect(calcOutcome("active", 50, 4)).toBe("insufficient");
  });
});
