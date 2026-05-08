import { describe, it, expect } from "vitest";

// SCRUM-106: Tests unitarios — transformaciones de datos y cálculos

// Score de autoevaluación: respuestas correctas / total * 100
function calcAssessmentScore(answers: number[], correctIndices: number[]): number {
  if (correctIndices.length === 0) return 0;
  const correct = answers.filter((ans, i) => ans === correctIndices[i]).length;
  return Math.round((correct / correctIndices.length) * 100);
}

// Tasa de conversión de campaña: enrolled / total inquiries * 100
function calcConversionRate(enrolled: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((enrolled / total) * 100);
}

// Promedio de ratings de encuesta docente
function calcSurveyAverage(ratings: number[][]): number[] {
  if (ratings.length === 0) return [];
  const dims = ratings[0].length;
  return Array.from({ length: dims }, (_, i) => {
    const sum = ratings.reduce((acc, r) => acc + r[i], 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  });
}

// Agregado de pagos por estado
function calcPaymentSummary(payments: { amount: number; status: string }[]) {
  return payments.reduce(
    (acc, p) => {
      acc.total += Number(p.amount);
      acc.counts[p.status] = (acc.counts[p.status] ?? 0) + 1;
      return acc;
    },
    { total: 0, counts: {} as Record<string, number> }
  );
}

describe("calcAssessmentScore", () => {
  it("puntaje perfecto cuando todas correctas", () => {
    expect(calcAssessmentScore([0, 1, 2], [0, 1, 2])).toBe(100);
  });

  it("puntaje 0 cuando todas incorrectas", () => {
    expect(calcAssessmentScore([1, 2, 0], [0, 1, 2])).toBe(0);
  });

  it("calcula correctamente parciales", () => {
    expect(calcAssessmentScore([0, 2, 2], [0, 1, 2])).toBe(67); // 2/3
    expect(calcAssessmentScore([0, 1, 0], [0, 1, 2])).toBe(67); // 2/3
  });

  it("retorna 0 si no hay preguntas", () => {
    expect(calcAssessmentScore([], [])).toBe(0);
  });

  it("una sola pregunta correcta → 100", () => {
    expect(calcAssessmentScore([3], [3])).toBe(100);
  });

  it("una sola pregunta incorrecta → 0", () => {
    expect(calcAssessmentScore([0], [2])).toBe(0);
  });
});

describe("calcConversionRate", () => {
  it("calcula tasa correctamente", () => {
    expect(calcConversionRate(5, 10)).toBe(50);
    expect(calcConversionRate(3, 4)).toBe(75);
    expect(calcConversionRate(10, 10)).toBe(100);
  });

  it("retorna 0 si no hay consultas", () => {
    expect(calcConversionRate(0, 0)).toBe(0);
  });

  it("retorna 0 si nadie se inscribió", () => {
    expect(calcConversionRate(0, 10)).toBe(0);
  });
});

describe("calcSurveyAverage", () => {
  it("promedia correctamente 4 dimensiones", () => {
    const result = calcSurveyAverage([
      [4, 3, 5, 4],
      [5, 4, 4, 5],
    ]);
    expect(result).toEqual([4.5, 3.5, 4.5, 4.5]);
  });

  it("una sola respuesta retorna sus valores", () => {
    expect(calcSurveyAverage([[3, 4, 5, 2]])).toEqual([3, 4, 5, 2]);
  });

  it("retorna array vacío sin respuestas", () => {
    expect(calcSurveyAverage([])).toEqual([]);
  });
});

describe("calcPaymentSummary", () => {
  const payments = [
    { amount: 5000, status: "paid" },
    { amount: 3000, status: "pending" },
    { amount: 5000, status: "paid" },
    { amount: 4000, status: "overdue" },
  ];

  it("suma el total correctamente", () => {
    const { total } = calcPaymentSummary(payments);
    expect(total).toBe(17000);
  });

  it("cuenta por estado correctamente", () => {
    const { counts } = calcPaymentSummary(payments);
    expect(counts.paid).toBe(2);
    expect(counts.pending).toBe(1);
    expect(counts.overdue).toBe(1);
  });

  it("retorna total 0 con array vacío", () => {
    const { total, counts } = calcPaymentSummary([]);
    expect(total).toBe(0);
    expect(Object.keys(counts).length).toBe(0);
  });
});
