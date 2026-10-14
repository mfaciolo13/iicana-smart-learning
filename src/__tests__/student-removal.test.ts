import { describe, it, expect } from "vitest";
import { removalMode, removalPrompt } from "@/modules/students/lib/removal";

// SCRUM-281: dar de baja un alumno con historia no borra pagos ni inscripciones

describe("removalMode", () => {
  it("con pagos o inscripciones: baja lógica", () => {
    expect(removalMode({ paymentsCount: 2, enrollmentsCount: 0 }, "director")).toBe("deactivate");
    expect(removalMode({ paymentsCount: 0, enrollmentsCount: 1 }, "director")).toBe("deactivate");
  });

  it("sin historia y director: borrado físico", () => {
    expect(removalMode({ paymentsCount: 0, enrollmentsCount: 0 }, "director")).toBe("delete");
  });

  it("el administrativo nunca borra físicamente", () => {
    expect(removalMode({ paymentsCount: 0, enrollmentsCount: 0 }, "administrativo")).toBe("deactivate");
  });
});

describe("removalPrompt", () => {
  const student = { fullName: "Ana Pérez", dni: "12345678" };

  it("nombra al alumno e informa lo que se conserva", () => {
    const p = removalPrompt(student, { paymentsCount: 3, enrollmentsCount: 1 }, "director");
    expect(p.label).toBe("Dar de baja");
    expect(p.message).toContain("Ana Pérez (DNI 12345678)");
    expect(p.message).toContain("3 pagos y 1 inscripción");
  });

  it("sin historia pide confirmación del borrado definitivo", () => {
    const p = removalPrompt(student, { paymentsCount: 0, enrollmentsCount: 0 }, "director");
    expect(p.label).toBe("Eliminar");
    expect(p.message).toContain("definitivamente");
  });
});
