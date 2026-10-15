import { describe, it, expect } from "vitest";
import { filterPayments } from "@/modules/payments/lib/filters";
import { buildGradeFilterFields, filterGrades } from "@/modules/grades/lib/filters";
import { buildSessionFilterFields, filterSessions, sessionPct } from "@/modules/attendance/lib/filters";
import type { PaymentListItem } from "@/modules/payments/types";
import type { GradeWithDetails } from "@/modules/grades/types";
import type { AttendanceSession } from "@/modules/attendance/types";

const pay = (over: Partial<PaymentListItem>): PaymentListItem => ({
  id: "p",
  amount: "15000",
  dueDate: "2026-09-10",
  paidAt: null,
  status: "pending",
  receiptNumber: null,
  method: null,
  studentName: "Ana Pérez",
  studentDni: "30111222",
  isOverdue: false,
  ...over,
});

describe("filtros de pagos (pantalla y Excel)", () => {
  const all = [
    pay({ id: "1", status: "paid", method: "transfer", receiptNumber: "R-1", dueDate: "2026-06-10", studentName: "Ñandú López" }),
    pay({ id: "2", status: "pending", isOverdue: true, dueDate: "2026-09-10" }),
    pay({ id: "3", status: "paid", method: "cash", dueDate: "2026-07-10", studentName: "Beto Díaz" }),
  ];

  it("la pestaña de estado usa el estado efectivo: una pendiente vencida cuenta como vencida", () => {
    expect(filterPayments(all, { status: "overdue" }).list.map((p) => p.id)).toEqual(["2"]);
    expect(filterPayments(all, { status: "pending" }).list).toEqual([]);
  });

  it("combina método, recibo y rango de vencimiento", () => {
    expect(filterPayments(all, { metodo: "transfer" }).list.map((p) => p.id)).toEqual(["1"]);
    expect(filterPayments(all, { recibo: "sin" }).list.map((p) => p.id)).toEqual(["2", "3"]);
    expect(filterPayments(all, { desde: "2026-07-01", hasta: "2026-09-30" }).list.map((p) => p.id)).toEqual(["2", "3"]);
  });

  it("la búsqueda ignora acentos y mayúsculas, y un valor adulterado se descarta", () => {
    expect(filterPayments(all, { q: "nandu" }).list.map((p) => p.id)).toEqual(["1"]);
    expect(filterPayments(all, { metodo: "bitcoin", status: "hack" }).list).toHaveLength(3);
  });
});

const grade = (over: Partial<GradeWithDetails>): GradeWithDetails =>
  ({
    id: "g",
    enrollmentId: "e",
    evaluationType: "parcial",
    score: "8.00",
    evaluatedAt: new Date("2026-10-13T15:00:00Z"),
    notes: null,
    studentName: "Ana Pérez",
    studentDni: "30111222",
    courseName: "Adults 1",
    courseLevel: "beginner",
    ...over,
  }) as GradeWithDetails;

describe("filtros de notas (pantalla y Excel)", () => {
  const all = [
    grade({ id: "1", score: "9.00" }),
    grade({ id: "2", score: "5.00", evaluationType: "quiz", courseName: "Adults 2" }),
    grade({ id: "3", score: "7.00", evaluatedAt: new Date("2026-05-12T15:00:00Z") }),
  ];
  const fields = buildGradeFilterFields(["Adults 1", "Adults 2"]);

  it("filtra por resultado, tipo y curso", () => {
    expect(filterGrades(all, { resultado: "aprobada" }, fields).list.map((g) => g.id)).toEqual(["1", "3"]);
    expect(filterGrades(all, { resultado: "desaprobada" }, fields).list.map((g) => g.id)).toEqual(["2"]);
    expect(filterGrades(all, { tipo: "quiz", curso: "Adults 2" }, fields).list.map((g) => g.id)).toEqual(["2"]);
  });

  it("el rango de fechas usa el día del instituto", () => {
    expect(filterGrades(all, { desde: "2026-10-01" }, fields).list.map((g) => g.id)).toEqual(["1", "2"]);
    expect(filterGrades(all, { hasta: "2026-05-31" }, fields).list.map((g) => g.id)).toEqual(["3"]);
  });

  it("un curso que no está en las opciones se ignora", () => {
    expect(filterGrades(all, { curso: "Curso inventado" }, fields).list).toHaveLength(3);
  });
});

const session = (over: Partial<AttendanceSession>): AttendanceSession => ({
  classDate: "2026-10-13",
  courseId: "c1",
  courseName: "Adults 1",
  total: 10,
  present: 8,
  absent: 2,
  late: 0,
  ...over,
});

describe("filtros de clases con asistencia (pantalla y Excel)", () => {
  const all = [
    session({ courseId: "c1", present: 9, absent: 1 }),
    session({ courseId: "c2", courseName: "Adults 2", present: 5, absent: 5, classDate: "2026-05-19" }),
    session({ courseId: "c1", present: 6, absent: 3, late: 1, classDate: "2026-06-18" }),
  ];
  const fields = buildSessionFilterFields(all);

  it("calcula el porcentaje con presentes y tardanzas", () => {
    expect(sessionPct(all[2])).toBe(70);
    expect(sessionPct({ total: 0, present: 0, late: 0 })).toBe(0);
  });

  it("filtra por porcentaje, curso y fechas", () => {
    expect(filterSessions(all, { asistencia: "menos60" }, fields).list.map((s) => s.courseId)).toEqual(["c2"]);
    expect(filterSessions(all, { asistencia: "menos80" }, fields).list).toHaveLength(2);
    expect(filterSessions(all, { asistencia: "80mas" }, fields).list).toHaveLength(1);
    expect(filterSessions(all, { curso: "c1", hasta: "2026-06-30" }, fields).list.map((s) => s.classDate)).toEqual(["2026-06-18"]);
  });
});
