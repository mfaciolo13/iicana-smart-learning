import { describe, it, expect } from "vitest";
import { parseQuestions, isTimeoutError } from "@/modules/assessments/lib/questions";

// SCRUM-317: el JSON del modelo se valida con Zod y los errores son claros

const q = (i: number) => ({
  question: `Pregunta número ${i} del quiz`,
  options: ["a", "b", "c", "d"],
  correct: i % 4,
  explanation: "Porque sí.",
});
const quiz = (n: number) => JSON.stringify(Array.from({ length: n }, (_, i) => q(i)));

describe("parseQuestions", () => {
  it("acepta 10 preguntas válidas, incluso con texto alrededor", () => {
    const r = parseQuestions(`Acá van:\n${quiz(10)}\nListo.`);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.questions).toHaveLength(10);
  });

  it("rechaza texto sin JSON", () => {
    const r = parseQuestions("Lo siento, no puedo.");
    expect(r.ok).toBe(false);
  });

  it("rechaza JSON truncado", () => {
    const r = parseQuestions(quiz(10).slice(0, 200) + "]");
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("incompleta") });
  });

  it("rechaza preguntas con forma inválida (opciones, correct fuera de rango, faltantes)", () => {
    const bad = (patch: object) => JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ ...q(i), ...patch })));
    expect(parseQuestions(bad({ options: ["a", "b"] })).ok).toBe(false);
    expect(parseQuestions(bad({ correct: 7 })).ok).toBe(false);
    expect(parseQuestions(bad({ explanation: "" })).ok).toBe(false);
    expect(parseQuestions(bad({ correct: "0" })).ok).toBe(false);
  });

  it("rechaza muy pocas o demasiadas preguntas", () => {
    expect(parseQuestions(quiz(3)).ok).toBe(false);
    expect(parseQuestions(quiz(20)).ok).toBe(false);
  });
});

describe("isTimeoutError", () => {
  it("detecta timeouts y abortos", () => {
    expect(isTimeoutError(new Error("Request timed out."))).toBe(true);
    expect(isTimeoutError(Object.assign(new Error("x"), { name: "AbortError" }))).toBe(true);
    expect(isTimeoutError(new Error("Connection refused"))).toBe(false);
  });
});
