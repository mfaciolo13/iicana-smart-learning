import { describe, it, expect } from "vitest";
import { effectiveStatus, summarizePayments } from "@/modules/payments/lib/buckets";

const row = (status: string, isOverdue: boolean, amount = "1000") => ({ status: status as never, isOverdue, amount });

describe("estado efectivo de las cuotas (SCRUM-285)", () => {
  it("una cuota pending con vencimiento pasado cuenta como vencida", () => {
    expect(effectiveStatus(row("pending", true))).toBe("overdue");
    expect(effectiveStatus(row("pending", false))).toBe("pending");
    expect(effectiveStatus(row("paid", false))).toBe("paid");
  });

  it("los contadores no se superponen y la deuda incluye suspendidas", () => {
    const s = summarizePayments([
      row("pending", true, "15000"),
      row("overdue", true, "15000"),
      row("suspended", false, "500"),
      row("paid", false, "40000"),
      row("cancelled", false, "100"),
    ]);
    expect(s).toEqual({ pending: 0, overdue: 2, paid: 1, totalPendingAmount: 30500 });
  });
});
