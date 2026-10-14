// SCRUM-281: dar de baja un alumno no debe borrar su historia contable. Reglas:
//  - Con pagos o inscripciones (o si quien actúa no es director): baja lógica — queda inactivo
//    y sin acceso, y sus pagos e inscripciones se conservan.
//  - Sin pagos ni inscripciones y siendo director: borrado físico.

export interface RemovalImpact {
  paymentsCount: number;
  enrollmentsCount: number;
}

export type RemovalMode = "deactivate" | "delete";

export function removalMode(impact: RemovalImpact, role: string): RemovalMode {
  const hasHistory = impact.paymentsCount > 0 || impact.enrollmentsCount > 0;
  return hasHistory || role !== "director" ? "deactivate" : "delete";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Texto del botón y de la confirmación, con nombre, DNI y lo que se ve afectado. */
export function removalPrompt(
  student: { fullName: string; dni: string },
  impact: RemovalImpact,
  role: string
): { label: string; message: string } {
  const who = `${student.fullName} (DNI ${student.dni})`;
  if (removalMode(impact, role) === "deactivate") {
    const kept: string[] = [];
    if (impact.paymentsCount > 0) kept.push(plural(impact.paymentsCount, "pago", "pagos"));
    if (impact.enrollmentsCount > 0) kept.push(plural(impact.enrollmentsCount, "inscripción", "inscripciones"));
    const keptText = kept.length > 0 ? ` Se conservan ${kept.join(" y ")}.` : "";
    return {
      label: "Dar de baja",
      message: `¿Dar de baja a ${who}? Quedará inactivo y sin acceso al sistema.${keptText}`,
    };
  }
  return {
    label: "Eliminar",
    message: `¿Eliminar definitivamente a ${who}? No tiene pagos ni inscripciones. Esta acción no se puede deshacer.`,
  };
}
