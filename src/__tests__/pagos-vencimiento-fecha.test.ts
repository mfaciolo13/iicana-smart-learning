import { describe, it, expect } from "vitest";
import { todayInstitute } from "@/lib/validation";

/**
 * SCRUM-361 — fechas en UTC en la pantalla de pagos.
 *
 * El vencimiento por defecto se armaba con setDate(10) en hora local y se
 * serializaba con toISOString() (UTC): después de las 21:00 ART la fecha salía
 * el día 11, contra la regla de negocio que fija el 10. Y el badge "Vencido"
 * del detalle comparaba contra un "hoy" en UTC mientras el servicio usa la hora
 * del instituto, así que una misma cuota se veía "Vencido" en el detalle y
 * "Pendiente" en el listado.
 */

/** Misma funcion que usa PaymentForm. */
function defaultDueDate(now: Date): string {
  const [year, month, day] = todayInstitute(now).split("-").map(Number);
  if (day <= 10) return `${year}-${String(month).padStart(2, "0")}-10`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-10`;
}

/** Calculo anterior, para contrastar. */
function defaultDueDateUTC(now: Date): string {
  const d = new Date(now);
  d.setDate(10);
  if (d < now) d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

describe("vencimiento por defecto", () => {
  it("a las 22:00 de Cordoba propone el dia 10, no el 11", () => {
    // 2026-10-05 22:00 ART === 2026-10-06 01:00 UTC
    const now = new Date("2026-10-06T01:00:00.000Z");
    expect(defaultDueDate(now)).toBe("2026-10-10");
  });

  it("el dia 10 todavia propone ese mismo dia", () => {
    const now = new Date("2026-10-10T15:00:00.000Z"); // 12:00 ART del 10
    expect(defaultDueDate(now)).toBe("2026-10-10");
  });

  it("pasado el 10 propone el 10 del mes siguiente", () => {
    const now = new Date("2026-10-11T15:00:00.000Z");
    expect(defaultDueDate(now)).toBe("2026-11-10");
  });

  it("en diciembre pasa correctamente a enero del ano siguiente", () => {
    const now = new Date("2026-12-20T15:00:00.000Z");
    expect(defaultDueDate(now)).toBe("2027-01-10");
  });

  it("siempre cae un dia 10", () => {
    for (const iso of [
      "2026-01-15T23:00:00.000Z",
      "2026-02-28T02:00:00.000Z",
      "2026-06-10T23:30:00.000Z",
      "2026-12-31T23:59:00.000Z",
    ]) {
      expect(defaultDueDate(new Date(iso)).endsWith("-10")).toBe(true);
    }
  });
});

describe("badge Vencido del detalle", () => {
  it("una cuota que vence hoy no figura vencida a las 21:30", () => {
    const now = new Date("2026-10-16T00:30:00.000Z"); // 21:30 ART del 15
    const dueDate = "2026-10-15";

    // El detalle marca vencido cuando dueDate < today.
    expect(dueDate < todayInstitute(now)).toBe(false);

    // Con el calculo UTC anterior si la marcaba, contradiciendo al listado.
    expect(dueDate < now.toISOString().split("T")[0]).toBe(true);
  });

  it("una cuota vencida ayer si figura vencida", () => {
    const now = new Date("2026-10-15T15:00:00.000Z");
    expect("2026-10-14" < todayInstitute(now)).toBe(true);
  });
});
