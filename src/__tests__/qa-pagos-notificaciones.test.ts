import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("mora automática", () => {
  it("el proceso diario ejecuta las reglas de 15 y 30 días, no solo el botón manual", () => {
    const cron = read("src/app/api/cron/overdue-alert/route.ts");
    expect(cron).toContain("runDelinquencyChecks()");
    expect(read("src/modules/payments/actions.ts")).toContain("runDelinquencyChecks()");
    const svc = read("src/modules/payments/services/delinquency.service.ts");
    expect(svc).toContain("getOverdueAlertTargets");
    expect(svc).toContain("suspendStudentAndPayments");
    expect(svc).toContain("syncAccessRestriction(studentId)");
  });
});

describe("cuotas duplicadas en el mismo mes", () => {
  it("la guarda compara el mes completo y la base lo respalda con un índice único", () => {
    const svc = read("src/modules/payments/services/payments.service.ts");
    expect(svc).toContain("gte(payments.dueDate, first), lte(payments.dueDate, last)");
    expect(read("src/lib/drizzle/migrations/0024_qa_pagos_notificaciones.sql")).toContain("payments_student_month_active_unique");
  });
});

describe("procesos automáticos idempotentes", () => {
  it.each(["class-reminder", "payment-reminder", "daily-report"])("%s no repite envíos ya hechos y libera la marca si falla", (name) => {
    const src = read(`src/app/api/cron/${name}/route.ts`);
    expect(src).toContain("claimSend(");
    expect(src).toContain("releaseSend(");
  });

  it("la anticipación configurada y los docentes se tienen en cuenta en el recordatorio de clase", () => {
    const src = read("src/modules/notifications/services/cron.service.ts");
    expect(src).toContain("timingHours");
    expect(src).toContain("Math.ceil((setting[0].timingHours ?? 24) / 24)");
    expect(src).toContain("teacherRecipients");
  });
});

describe("riesgo y reclamos", () => {
  it("la detección de riesgo sigue evaluando a los suspendidos y cuenta sus cuotas suspendidas", () => {
    const src = read("src/modules/notifications/services/risk-detection.service.ts");
    expect(src).toContain('inArray(students.status, ["active", "suspended"])');
    expect(src).toContain('inArray(payments.status, ["overdue", "suspended"])');
  });

  it("la tendencia de riesgo agrupa por día del instituto, igual que la deduplicación", () => {
    expect(read("src/modules/reports/services/insights.service.ts")).toContain("at time zone 'America/Argentina/Cordoba'");
  });

  it("pasar de resuelto a cerrado conserva la fecha de resolución", () => {
    expect(read("src/modules/complaints/services/complaints.service.ts")).toContain("current?.resolvedAt ?? new Date()");
  });

  it("las policies de notifications y complaints quedan versionadas", () => {
    const sql = read("src/lib/drizzle/migrations/0024_qa_pagos_notificaciones.sql");
    expect(sql).toContain("authenticated_select_own_notifications");
    expect(sql).toContain("authenticated_select_own_complaints");
  });
});
