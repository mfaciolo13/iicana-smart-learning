import { describe, it, expect } from "vitest";
import { describeActiveFilters, filterKeys, inDateRange, isValidIsoDate, parseFilters, type FilterField } from "@/lib/filters";

const fields: FilterField[] = [
  {
    key: "estado",
    label: "Estado",
    type: "select",
    options: [
      { value: "active", label: "Activo" },
      { value: "suspended", label: "Suspendido" },
    ],
  },
  { key: "desde", label: "Desde", type: "date" },
];

describe("parseFilters", () => {
  it("acepta valores de la lista y fechas válidas", () => {
    expect(parseFilters({ estado: "active", desde: "2026-10-01" }, fields)).toEqual({ estado: "active", desde: "2026-10-01" });
  });

  it("descarta valores fuera de las opciones y fechas inválidas", () => {
    expect(parseFilters({ estado: "hacked", desde: "2026-13-45" }, fields)).toEqual({});
    expect(parseFilters({ estado: "<script>", desde: "mañana" }, fields)).toEqual({});
  });

  it("ignora parámetros que no son filtros", () => {
    expect(parseFilters({ sort: "dni", page: "3" }, fields)).toEqual({});
  });
});

describe("isValidIsoDate", () => {
  it("valida el formato y que la fecha exista", () => {
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("26-02-28")).toBe(false);
  });
});

describe("describeActiveFilters", () => {
  it("devuelve chips legibles, con la búsqueda primero y las fechas en formato argentino", () => {
    expect(describeActiveFilters({ estado: "suspended", desde: "2026-10-01" }, fields, "ana")).toEqual([
      { key: "q", label: "Búsqueda", valueLabel: "ana" },
      { key: "estado", label: "Estado", valueLabel: "Suspendido" },
      { key: "desde", label: "Desde", valueLabel: "01/10/2026" },
    ]);
  });

  it("sin filtros no hay chips", () => {
    expect(describeActiveFilters({}, fields)).toEqual([]);
  });
});

describe("inDateRange", () => {
  it("respeta los límites inclusivos y acepta timestamps", () => {
    expect(inDateRange("2026-10-05", "2026-10-01", "2026-10-05")).toBe(true);
    expect(inDateRange("2026-10-06T03:00:00Z", undefined, "2026-10-05")).toBe(false);
    expect(inDateRange("2026-09-30", "2026-10-01")).toBe(false);
  });

  it("sin límites todo pasa; sin fecha, con límite, no", () => {
    expect(inDateRange(null)).toBe(true);
    expect(inDateRange(null, "2026-10-01")).toBe(false);
  });
});

describe("filterKeys", () => {
  it("incluye la búsqueda y las claves de cada filtro", () => {
    expect(filterKeys(fields)).toEqual(["q", "estado", "desde"]);
  });
});
