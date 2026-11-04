import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkDirectorAccess } from "@/lib/auth/route-access";
import { MIN_SURVEY_RESPONSES, canShowSurveyResults } from "@/modules/teacher-evaluations/lib/anonymity";
import { meetsAttendance, meetsGrades } from "@/modules/promotions/eligibility";
import { LAST_LEVEL } from "@/modules/year-end/services/year-end.service";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ID = "123e4567-e89b-42d3-a456-426614174000";

describe("anonimato de las encuestas docentes", () => {
  it("no muestra resultados hasta tener un mínimo de respuestas", () => {
    expect(MIN_SURVEY_RESPONSES).toBe(3);
    expect(canShowSurveyResults(0)).toBe(false);
    expect(canShowSurveyResults(1)).toBe(false);
    expect(canShowSurveyResults(2)).toBe(false);
    expect(canShowSurveyResults(3)).toBe(true);
  });

  it("la marca de 'ya respondió' y la respuesta se guardan en transacciones separadas y con la hora truncada", () => {
    const src = read("src/modules/teacher-evaluations/services/teacher-evaluations.service.ts");
    const fn = src.slice(src.indexOf("export async function submitSurvey"), src.indexOf("export async function hasSurveySubmitted"));
    expect(fn).not.toContain("transaction(");
    expect(fn).toContain("date_trunc('week', now())");
    // Si falla el guardado de la respuesta se retira la marca para poder reintentar.
    expect(fn).toContain("delete(teacherSurveySubmissions)");
  });

  it("el informe del director y los promedios respetan el mínimo", () => {
    expect(read("src/app/(dashboard)/director/teacher-evaluations/[teacherId]/page.tsx")).toContain("canShowSurveyResults(surveys.length)");
    const svc = read("src/modules/teacher-evaluations/services/teacher-evaluations.service.ts");
    expect(svc).toContain("!canShowSurveyResults(agg.total)");
    expect(svc).toContain("canShowSurveyResults(r.surveyCount)");
  });
});

describe("elegibilidad de promoción", () => {
  it("compara con los valores exactos: 79,5 % de asistencia y 6,95 de promedio no alcanzan", () => {
    expect(meetsAttendance(159, 200)).toBe(false); // 79,5 %
    expect(meetsAttendance(160, 200)).toBe(true);
    expect(meetsGrades(6.95)).toBe(false);
    expect(meetsGrades(7)).toBe(true);
  });

  it("Promociones y Cierre de ciclo usan el servicio en lugar de reimplementar el cálculo con valores redondeados", () => {
    const promotions = read("src/app/(dashboard)/director/promotions/page.tsx");
    expect(promotions).toContain("getPromotionEligibility()");
    expect(promotions).not.toContain("Math.round((present / total) * 100)");
    const yearEnd = read("src/app/(dashboard)/director/year-end/page.tsx");
    expect(yearEnd).toContain("getYearEndReport()");
    expect(yearEnd).not.toContain("Math.round((present / total) * 100)");
  });
});

describe("cierre de ciclo", () => {
  it("solo egresa quien terminó el último nivel", () => {
    expect(LAST_LEVEL).toBe("advanced");
    const src = read("src/modules/year-end/services/year-end.service.ts");
    expect(src).toContain("active.length === 0 && finishedLastLevel");
  });

  it("un alumno suspendido no se promueve ni egresa", () => {
    const src = read("src/modules/year-end/services/year-end.service.ts");
    expect(src).toContain('r.studentStatus === "active" ? "eligible" : "suspended"');
  });

  it("informa a quiénes no les llegó el email de felicitación", () => {
    expect(read("src/modules/year-end/actions.ts")).toContain("failed.push(s.fullName)");
  });

  it("la confirmación dice a cuántos alumnos afecta", () => {
    expect(read("src/app/(dashboard)/director/year-end/page.tsx")).toContain("Se van a promover ${summary.eligible}");
  });
});

describe("autoevaluaciones", () => {
  it("la respuesta confirmada queda registrada y es la que cuenta", () => {
    const actions = read("src/modules/assessments/actions.ts");
    expect(actions).toContain("recordAnswerReveal(");
    const svc = read("src/modules/assessments/services/assessments.service.ts");
    expect(svc).toContain("reveals.get(i)?.chosenIndex ?? ans");
    expect(read("src/lib/drizzle/migrations/0023_autoevaluaciones_integridad.sql")).toContain("assessment_attempts_assessment_student_unique");
  });
});

describe("acceso del personal administrativo a Dirección", () => {
  it("puede abrir el detalle de una nota, pero no el alta ni otras pantallas de Dirección", () => {
    expect(checkDirectorAccess("administrativo", `/director/grades/${ID}`)).toEqual({ allowed: true });
    expect(checkDirectorAccess("administrativo", "/director/grades/new")).toEqual({ allowed: false, redirectTo: "/403" });
    expect(checkDirectorAccess("administrativo", `/director/grades/${ID}/edit`)).toEqual({ allowed: false, redirectTo: "/403" });
    expect(checkDirectorAccess("administrativo", "/director/users")).toEqual({ allowed: false, redirectTo: "/403" });
    expect(checkDirectorAccess("director", "/director/grades/new")).toEqual({ allowed: true });
  });
});
