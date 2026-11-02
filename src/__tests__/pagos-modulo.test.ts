import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPaymentSchema, markAsPaidSchema, updatePaymentSchema } from "@/modules/payments/schemas";
import { buildPaymentFilterFields, filterPayments } from "@/modules/payments/lib/filters";
import { receiptEmail, withdrawalNoticeEmail } from "@/modules/payments/lib/emails";
import { periodLabel } from "@/modules/payments/lib/period-label";
import type { PaymentListItem } from "@/modules/payments/types";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const valid = { studentId: UUID, amount: 70000, dueDate: "2026-11-10" };

describe("alta de cuota con precios por medio de pago", () => {
  it("acepta precios opcionales y los deja indefinidos si vienen vacíos", () => {
    const r = createPaymentSchema.safeParse({ ...valid, transferPrice: "", cashPrice: "", courseId: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.transferPrice).toBeUndefined();
      expect(r.data.cashPrice).toBeUndefined();
      expect(r.data.courseId).toBeUndefined();
    }
  });

  it("acepta los precios de la planilla (70.000 / 66.500 / 63.000)", () => {
    const r = createPaymentSchema.safeParse({ ...valid, transferPrice: "66500", cashPrice: "63000" });
    expect(r.success).toBe(true);
  });

  it("rechaza un precio con descuento mayor al de lista", () => {
    const t = createPaymentSchema.safeParse({ ...valid, transferPrice: 71000 });
    expect(t.success).toBe(false);
    const c = createPaymentSchema.safeParse({ ...valid, cashPrice: 80000 });
    expect(c.success).toBe(false);
  });

  it("rechaza precios negativos o en cero", () => {
    expect(createPaymentSchema.safeParse({ ...valid, cashPrice: -5 }).success).toBe(false);
    expect(createPaymentSchema.safeParse({ ...valid, transferPrice: 0 }).success).toBe(false);
  });

  it("la edición hereda las mismas reglas de precios", () => {
    const base = { id: UUID, amount: 70000, dueDate: "2026-11-10" };
    expect(updatePaymentSchema.safeParse({ ...base, transferPrice: 66500 }).success).toBe(true);
    expect(updatePaymentSchema.safeParse({ ...base, cashPrice: 99999 }).success).toBe(false);
  });
});

describe("cobro manual: el importe de la pantalla es solo una comparación", () => {
  it("acepta un importe esperado decimal", () => {
    expect(markAsPaidSchema.safeParse({ id: UUID, method: "cash", expectedAmount: "63000.00" }).success).toBe(true);
  });

  it("rechaza un importe esperado con formato inválido", () => {
    expect(markAsPaidSchema.safeParse({ id: UUID, method: "cash", expectedAmount: "63.000,00" }).success).toBe(false);
    expect(markAsPaidSchema.safeParse({ id: UUID, method: "cash", expectedAmount: "-1" }).success).toBe(false);
  });

  it("el servicio de cobro compara contra el importe que calcula él mismo", () => {
    const src = readFileSync(join(process.cwd(), "src/modules/payments/services/collect.service.ts"), "utf8");
    expect(src).toContain("amount_mismatch");
    expect(src).toContain("quotePayment(pricesOf(current), input.method, todayInstitute(), rates)");
  });
});

function item(over: Partial<PaymentListItem>): PaymentListItem {
  return {
    id: "p",
    amount: "70000.00",
    dueDate: "2026-11-10",
    paidAt: null,
    status: "pending",
    receiptNumber: null,
    studentName: "Ana Pérez",
    studentDni: "30111222",
    isOverdue: false,
    ...over,
  };
}

describe("historial de pagos: filtros", () => {
  const list: PaymentListItem[] = [
    item({ id: "1", status: "paid", method: "cash", period: "2026-10", courseId: "c1", courseName: "Adultos 4", paidAt: new Date("2026-10-05T15:00:00Z"), invoiceStatus: "issued" }),
    item({ id: "2", status: "paid", method: "card", period: "2026-11", courseId: "c2", courseName: "Adultos 2", paidAt: new Date("2026-11-12T15:00:00Z"), invoiceStatus: "failed" }),
    item({ id: "3", status: "paid", method: "transfer", period: "2026-11", courseId: "c1", courseName: "Adultos 4", paidAt: new Date("2026-11-03T15:00:00Z"), invoiceStatus: null }),
  ];
  const ids = (sp: Record<string, string>) => filterPayments(list, sp).list.map((p) => p.id);

  it("ofrece solo cursos y períodos que existen", () => {
    const fields = buildPaymentFilterFields(list);
    const curso = fields.find((f) => f.key === "curso");
    const periodo = fields.find((f) => f.key === "periodo");
    expect(curso && curso.type === "select" && curso.options.map((o) => o.value)).toEqual(["c2", "c1"]);
    expect(periodo && periodo.type === "select" && periodo.options.map((o) => o.value)).toEqual(["2026-11", "2026-10"]);
  });

  it("filtra por curso, período, medio y estado de factura", () => {
    expect(ids({ curso: "c1" })).toEqual(["1", "3"]);
    expect(ids({ periodo: "2026-11" })).toEqual(["2", "3"]);
    expect(ids({ metodo: "card" })).toEqual(["2"]);
    expect(ids({ factura: "failed" })).toEqual(["2"]);
    expect(ids({ factura: "none" })).toEqual(["3"]);
  });

  it("filtra por rango de fecha de pago en hora del instituto", () => {
    expect(ids({ pagadoDesde: "2026-11-01", pagadoHasta: "2026-11-30" })).toEqual(["2", "3"]);
  });

  it("ignora un curso adulterado en la URL", () => {
    expect(ids({ curso: "otro" })).toEqual(["1", "2", "3"]);
  });
});

describe("correos del módulo", () => {
  const movement = {
    id: "9f1c2f0e-0000-4000-8000-000000000001",
    amount: "5000.00",
    reason: "Pago a proveedor",
    observations: null,
    balanceBefore: "20000.00",
    balanceAfter: "15000.00",
    occurredAt: new Date("2026-11-03T15:30:00Z"),
    createdByName: "Laura Gómez",
  };

  it("el aviso de retiro incluye importe, motivo, responsable, saldos e identificador", () => {
    const html = withdrawalNoticeEmail(movement);
    for (const piece of ["5.000,00", "Pago a proveedor", "Laura Gómez", "20.000,00", "15.000,00", movement.id]) {
      expect(html).toContain(piece);
    }
  });

  it("escapa el texto de usuario en el aviso", () => {
    const html = withdrawalNoticeEmail({ ...movement, reason: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("el comprobante muestra el recargo y aclara que no es una factura", () => {
    const html = receiptEmail({
      studentName: "Ana Pérez",
      courseName: "Adultos 4",
      period: "2026-11",
      method: "card",
      paidAt: new Date("2026-11-12T15:00:00Z"),
      listPrice: "70000.00",
      discountAmount: "0.00",
      surchargeAmount: "3500.00",
      finalAmount: "73500.00",
      receiptNumber: "REC-00000001",
      receiptUrl: "https://example.test/comprobante/abc",
    });
    expect(html).toContain("73.500,00");
    expect(html).toContain("Recargo");
    expect(html).toContain("no reemplaza a la factura");
    expect(html).toContain("REC-00000001");
  });

  it("formatea el período en español", () => {
    expect(periodLabel("2026-11")).toBe("Noviembre 2026");
    expect(periodLabel(null)).toBe("—");
  });
});

describe("permisos del módulo (verificados en el servidor)", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("la caja la opera solo el administrativo; el docente y el alumno no aparecen en ninguna acción de caja", () => {
    const src = read("src/modules/payments/cash-actions.ts");
    expect(src).not.toMatch(/requireRole\(\[[^\]]*(profesor|alumno)/);
    expect(src).toMatch(/registerCashWithdrawalAction[\s\S]*?requireRole\(\["administrativo"\]\)/);
    expect(src).toMatch(/registerCashIncomeAction[\s\S]*?requireRole\(\["administrativo"\]\)/);
    expect(src).toMatch(/reverseCashMovementAction[\s\S]*?requireRole\(\["director"\]\)/);
  });

  it("la política de precios y los precios por alumno son solo de Dirección", () => {
    const src = read("src/modules/payments/settings-actions.ts");
    expect(src).not.toMatch(/requireRole\(\[[^\]]*administrativo/);
    expect(src.match(/requireRole\(\["director"\]\)/g)?.length).toBe(3);
  });

  it("el portal del docente no tiene pantallas de pagos ni de caja", () => {
    const sidebar = read("src/components/shared/Sidebar.tsx");
    const profesorNav = sidebar.slice(sidebar.indexOf("profesor: ["), sidebar.indexOf("alumno: ["));
    expect(profesorNav).not.toMatch(/payments|Caja/);
  });

  it("el alumno solo abre comprobantes propios", () => {
    const src = read("src/app/(dashboard)/alumno/payments/[id]/receipt/page.tsx");
    expect(src).toContain("data.studentId !== studentId");
  });
});
