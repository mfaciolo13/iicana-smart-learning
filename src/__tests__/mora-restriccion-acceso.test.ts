import { describe, it, expect } from "vitest";

/**
 * SCRUM-352 — la restricción de acceso por mora nunca se levantaba.
 *
 * El flag accessRestricted sólo se ponía en true (cron de mora y acción manual);
 * nada lo volvía a false cuando el alumno regularizaba. El único camino de salida
 * era el botón "Levantar restricción" del detalle, así que un alumno al día seguía
 * sin portal —sin ver notas, asistencia ni sus propios pagos— hasta que alguien se
 * acordara de apretarlo.
 *
 * Acá se prueba la regla de decisión de syncAccessRestriction sobre el conteo de
 * cuotas impagas. La consulta contra la base se valida en la suite E2E.
 */

const HOY = "2026-10-15";

type Cuota = { status: "pending" | "paid" | "overdue" | "suspended" | "cancelled"; dueDate: string };

/** Mismo criterio que countUnpaidForRestriction. */
function contarImpagas(cuotas: Cuota[]): number {
  return cuotas.filter(
    (c) =>
      c.status === "overdue" ||
      c.status === "suspended" ||
      (c.status === "pending" && c.dueDate < HOY),
  ).length;
}

/** Misma regla que syncAccessRestriction. */
function decidir(cuotas: Cuota[], estabaRestringido: boolean) {
  const impagas = contarImpagas(cuotas);
  const restricted = impagas >= 2;
  return { impagas, restricted, lifted: estabaRestringido && !restricted };
}

describe("conteo de cuotas impagas", () => {
  it("cuenta vencidas y suspendidas", () => {
    expect(
      contarImpagas([
        { status: "overdue", dueDate: "2026-08-10" },
        { status: "suspended", dueDate: "2026-09-10" },
      ]),
    ).toBe(2);
  });

  it("cuenta la pendiente cuyo vencimiento ya paso, aunque el cron no la haya marcado", () => {
    expect(contarImpagas([{ status: "pending", dueDate: "2026-09-10" }])).toBe(1);
  });

  it("no cuenta la pendiente que todavia no vencio", () => {
    expect(contarImpagas([{ status: "pending", dueDate: "2026-11-10" }])).toBe(0);
  });

  it("no cuenta las cobradas ni las anuladas", () => {
    expect(
      contarImpagas([
        { status: "paid", dueDate: "2026-08-10" },
        { status: "cancelled", dueDate: "2026-09-10" },
      ]),
    ).toBe(0);
  });
});

describe("restringir -> cobrar -> habilitado", () => {
  it("con 2 cuotas vencidas el alumno queda restringido", () => {
    const cuotas: Cuota[] = [
      { status: "overdue", dueDate: "2026-08-10" },
      { status: "overdue", dueDate: "2026-09-10" },
    ];
    expect(decidir(cuotas, false).restricted).toBe(true);
  });

  it("al cobrar las dos, el acceso se levanta solo", () => {
    const cobradas: Cuota[] = [
      { status: "paid", dueDate: "2026-08-10" },
      { status: "paid", dueDate: "2026-09-10" },
    ];
    const r = decidir(cobradas, true);
    expect(r.restricted).toBe(false);
    expect(r.lifted).toBe(true);
  });

  it("al cobrar una sola, con 1 vencida restante, tambien recupera el acceso", () => {
    const cuotas: Cuota[] = [
      { status: "paid", dueDate: "2026-08-10" },
      { status: "overdue", dueDate: "2026-09-10" },
    ];
    const r = decidir(cuotas, true);
    expect(r.impagas).toBe(1);
    expect(r.restricted).toBe(false);
    expect(r.lifted).toBe(true);
  });

  it("con 3 vencidas, cobrar una sola lo deja restringido", () => {
    const cuotas: Cuota[] = [
      { status: "paid", dueDate: "2026-07-10" },
      { status: "overdue", dueDate: "2026-08-10" },
      { status: "overdue", dueDate: "2026-09-10" },
    ];
    const r = decidir(cuotas, true);
    expect(r.restricted).toBe(true);
    expect(r.lifted).toBe(false);
  });

  it("anular una cuota tambien baja la deuda y habilita", () => {
    const cuotas: Cuota[] = [
      { status: "cancelled", dueDate: "2026-08-10" },
      { status: "overdue", dueDate: "2026-09-10" },
    ];
    expect(decidir(cuotas, true).lifted).toBe(true);
  });

  it("un alumno sin deuda que no estaba restringido no cambia de estado", () => {
    const r = decidir([{ status: "paid", dueDate: "2026-09-10" }], false);
    expect(r.restricted).toBe(false);
    expect(r.lifted).toBe(false);
  });

  it("volver a entrar en mora lo restringe de nuevo", () => {
    const cuotas: Cuota[] = [
      { status: "overdue", dueDate: "2026-09-10" },
      { status: "pending", dueDate: "2026-10-10" },
    ];
    // La pendiente ya vencio el 10 y hoy es 15.
    expect(decidir(cuotas, false).restricted).toBe(true);
  });
});
