import { describe, it, expect } from "vitest";
import { todayInstitute, isFutureDate } from "@/lib/validation";
import { hourInstitute, addDaysInstitute } from "@/lib/format";

/**
 * SCRUM-355 — la fecha por defecto de "Tomar asistencia" se calculaba en UTC.
 * Córdoba está 3 horas detrás de UTC, así que desde las 21:00 local el "hoy" en
 * UTC ya es mañana y el servidor rechazaba la toma de lista por fecha futura.
 *
 * Las clases de 19:15 a 20:45 terminan justo antes del corte, así que el caso
 * se da todos los días.
 */

/** Mismo cálculo UTC que había antes del fix, para contrastar. */
function todayUTC(now: Date): string {
  return now.toISOString().split("T")[0];
}

describe("todayInstitute - zona horaria del instituto", () => {
  it("a las 21:30 de Córdoba devuelve el día de hoy, no el de mañana", () => {
    // 2026-10-15 21:30 ART === 2026-10-16 00:30 UTC
    const now = new Date("2026-10-16T00:30:00.000Z");

    expect(todayInstitute(now)).toBe("2026-10-15");
    // El cálculo viejo daba el día siguiente: ésta es exactamente la regresión.
    expect(todayUTC(now)).toBe("2026-10-16");
  });

  it("a las 22:00 de Córdoba la fecha por defecto sigue siendo la de hoy", () => {
    const now = new Date("2026-10-16T01:00:00.000Z"); // 22:00 ART del 15
    expect(todayInstitute(now)).toBe("2026-10-15");
  });

  it("a las 23:59 de Córdoba todavía es hoy", () => {
    const now = new Date("2026-10-16T02:59:00.000Z"); // 23:59 ART del 15
    expect(todayInstitute(now)).toBe("2026-10-15");
  });

  it("pasada la medianoche de Córdoba ya es el día siguiente", () => {
    const now = new Date("2026-10-16T03:30:00.000Z"); // 00:30 ART del 16
    expect(todayInstitute(now)).toBe("2026-10-16");
  });

  it("al mediodía ambos cálculos coinciden", () => {
    const now = new Date("2026-10-15T15:00:00.000Z"); // 12:00 ART
    expect(todayInstitute(now)).toBe("2026-10-15");
    expect(todayUTC(now)).toBe("2026-10-15");
  });
});

describe("la fecha por defecto es aceptada por el servidor", () => {
  it("a las 21:30 la fecha propuesta no es futura para el validador", () => {
    const now = new Date("2026-10-16T00:30:00.000Z");

    // Lo que hoy propone la pantalla de asistencia.
    expect(isFutureDate(todayInstitute(now), now)).toBe(false);

    // Lo que proponía antes: el propio servidor la rechazaba.
    expect(isFutureDate(todayUTC(now), now)).toBe(true);
  });

  it("al mediodía la fecha propuesta tampoco es futura", () => {
    const now = new Date("2026-10-15T15:00:00.000Z");
    expect(isFutureDate(todayInstitute(now), now)).toBe(false);
  });
});

describe("hourInstitute y addDaysInstitute", () => {
  it("a las 00:30 UTC todavía es de noche del día anterior en Córdoba (21:30)", () => {
    const now = new Date("2026-10-29T00:30:00.000Z"); // miércoles 28 21:30 ART
    expect(hourInstitute(now)).toBe(21);
    expect(todayInstitute(now)).toBe("2026-10-28");
  });

  it("suma y resta días sobre el calendario del instituto, no el de UTC", () => {
    const now = new Date("2026-10-29T00:30:00.000Z"); // hoy en ART: 2026-10-28
    expect(addDaysInstitute(1, now)).toBe("2026-10-29");
    expect(addDaysInstitute(-15, now)).toBe("2026-10-13");
    expect(addDaysInstitute(3, new Date("2026-10-30T12:00:00.000Z"))).toBe("2026-11-02");
  });
});
