import { matchesSearch } from "@/lib/search";
import { inDateRange, instituteDay, parseFilters, type FilterField, type FilterValues } from "@/lib/filters";
import { periodLabel } from "./period-label";
import { effectiveStatus } from "./buckets";
import type { PaymentListItem } from "../types";

export const PAYMENT_STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "overdue", label: "Vencidos" },
  { value: "paid", label: "Pagados" },
  { value: "suspended", label: "Suspendidos" },
  { value: "cancelled", label: "Anulados" },
];

const INVOICE_OPTIONS = [
  { value: "issued", label: "Facturado" },
  { value: "pending", label: "Factura en emisión" },
  { value: "failed", label: "Factura fallida" },
  { value: "none", label: "Sin factura" },
];

/**
 * Filtros del historial de pagos. Las opciones de curso y período salen de los propios pagos
 * cargados, así el desplegable nunca ofrece una opción que no devolvería resultados.
 */
export function buildPaymentFilterFields(all: PaymentListItem[] = []): FilterField[] {
  const courses = new Map<string, string>();
  const periods = new Set<string>();
  for (const p of all) {
    if (p.courseId && p.courseName) courses.set(p.courseId, p.courseName);
    if (p.period) periods.add(p.period);
  }
  return [
    {
      key: "metodo",
      label: "Medio de pago",
      type: "select",
      options: [
        { value: "cash", label: "Efectivo" },
        { value: "transfer", label: "Transferencia" },
        { value: "card", label: "Tarjeta" },
      ],
    },
    {
      key: "curso",
      label: "Curso",
      type: "select",
      options: [...courses.entries()].sort((x, y) => x[1].localeCompare(y[1])).map(([value, label]) => ({ value, label })),
    },
    {
      key: "periodo",
      label: "Período",
      type: "select",
      options: [...periods].sort().reverse().map((value) => ({ value, label: periodLabel(value) })),
    },
    { key: "factura", label: "Factura", type: "select", options: INVOICE_OPTIONS },
    {
      key: "recibo",
      label: "Recibo",
      type: "select",
      options: [
        { value: "con", label: "Con recibo" },
        { value: "sin", label: "Sin recibo" },
      ],
    },
    { key: "desde", label: "Vence desde", type: "date" },
    { key: "hasta", label: "Vence hasta", type: "date" },
    { key: "pagadoDesde", label: "Pagado desde", type: "date" },
    { key: "pagadoHasta", label: "Pagado hasta", type: "date" },
  ];
}

export interface PaymentFilterResult {
  list: PaymentListItem[];
  activeTab: string;
  filters: FilterValues;
  q: string | undefined;
}

/**
 * Aplica a la lista de pagos los mismos filtros que muestra la pantalla (pestaña de estado, búsqueda,
 * medio, curso, período, factura, recibo y rangos de vencimiento y de pago). Lo usan el listado y la
 * exportación a Excel, para que el archivo contenga exactamente lo que se ve.
 */
export function filterPayments(all: PaymentListItem[], sp: Record<string, string | undefined>): PaymentFilterResult {
  const { q } = sp;
  const activeTab = PAYMENT_STATUS_TABS.some((t) => t.value === sp.status) ? (sp.status as string) : "all";
  const filters = parseFilters(sp, buildPaymentFilterFields(all));

  let list = activeTab === "all" ? all : all.filter((p) => effectiveStatus(p) === activeTab);
  if (q) list = list.filter((p) => matchesSearch(p.studentName, q) || matchesSearch(p.studentDni, q) || matchesSearch(p.receiptNumber ?? "", q));
  if (filters.metodo) list = list.filter((p) => p.method === filters.metodo);
  if (filters.curso) list = list.filter((p) => p.courseId === filters.curso);
  if (filters.periodo) list = list.filter((p) => p.period === filters.periodo);
  if (filters.factura) {
    list = list.filter((p) => (filters.factura === "none" ? !p.invoiceStatus : p.invoiceStatus === filters.factura));
  }
  if (filters.recibo) list = list.filter((p) => Boolean(p.receiptNumber) === (filters.recibo === "con"));
  if (filters.desde || filters.hasta) list = list.filter((p) => inDateRange(p.dueDate, filters.desde, filters.hasta));
  if (filters.pagadoDesde || filters.pagadoHasta) {
    list = list.filter((p) => p.paidAt && inDateRange(instituteDay(p.paidAt), filters.pagadoDesde, filters.pagadoHasta));
  }

  return { list, activeTab, filters, q };
}
