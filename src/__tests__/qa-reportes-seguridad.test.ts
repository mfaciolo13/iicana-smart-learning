import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const walk = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

describe("errores de Supabase", () => {
  it("un fallo al cargar alumnos o docentes se propaga en vez de mostrarse como '0 registrados'", () => {
    const src = read("src/lib/query-cache.ts");
    expect(src).toContain("No se pudo cargar la lista de docentes");
    expect(src).toContain("No se pudo cargar la lista de alumnos");
    expect(src).toContain("No se pudieron cargar los perfiles");
  });
});

describe("analítica", () => {
  it("el panel del docente invierte una copia, no el arreglo original", () => {
    expect(read("src/modules/analytics/services/teacher-analytics.service.ts")).toContain("[...sessionRows]");
  });

  it("las faltas consecutivas se cuentan por inscripción, no por nombre", () => {
    const src = read("src/modules/analytics/services/teacher-analytics.service.ts");
    expect(src).toContain(".groupBy(enrollments.id, profiles.fullName)");
    expect(src).toContain('eq(enrollments.status, "active")');
  });

  it("el gráfico de autoevaluaciones del alumno muestra las más recientes en orden cronológico", () => {
    const src = read("src/modules/analytics/services/student-analytics.service.ts");
    expect(src).toContain("desc(assessmentAttempts.completedAt)");
    expect(src).toContain("[...attemptRows].reverse()");
  });

  it("el porcentaje de asistencia del Excel es numérico", () => {
    expect(read("src/modules/reports/services/reports.service.ts")).toContain(".mapWith(Number)");
  });
});

describe("fechas en hora del instituto", () => {
  it("ninguna pantalla formatea fechas con toLocaleDateString sin indicar la zona horaria", () => {
    const offenders = walk(join(process.cwd(), "src"))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("__tests__"))
      .filter((f) => /toLocaleDateString\("es-AR"\)/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("cabeceras de seguridad", () => {
  it("se envían protección contra enmarcado, nosniff, referrer y HSTS", async () => {
    const src = read("next.config.ts");
    for (const header of ["X-Frame-Options", "frame-ancestors", "X-Content-Type-Options", "Referrer-Policy", "Strict-Transport-Security", "Permissions-Policy"]) {
      expect(src).toContain(header);
    }
    expect(src).toContain('source: "/:path*"');
  });
});
