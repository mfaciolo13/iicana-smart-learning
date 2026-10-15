import { matchesSearch } from "@/lib/search";
import { inDateRange, parseFilters, type FilterField, type FilterValues } from "@/lib/filters";
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

export const PAYMENT_FILTER_FIELDS: FilterField[] = [
  {
    key: "metodo",
    label: "Método de pago",
    type: "select",
    options: [
      { value: "cash", label: "Efectivo" },
      { value: "transfer", label: "Transferencia" },
      { value: "card", label: "Tarjeta" },
    ],
  },
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
];

export interface PaymentFilterResult {
  list: PaymentListItem[];
  activeTab: string;
  filters: FilterValues;
  q: string | undefined;
}

/**
 * Aplica a la lista de pagos los mismos filtros que muestra la pantalla (pestaña de estado, búsqueda,
 * método, recibo y rango de vencimiento). Lo usan el listado y la exportación a Excel, para que el
 * archivo contenga exactamente lo que se ve.
 */
export function filterPayments(all: PaymentListItem[], sp: Record<string, string | undefined>): PaymentFilterResult {
  const { q } = sp;
  const activeTab = PAYMENT_STATUS_TABS.some((t) => t.value === sp.status) ? (sp.status as string) : "all";
  const filters = parseFilters(sp, PAYMENT_FILTER_FIELDS);

  let list = activeTab === "all" ? all : all.filter((p) => effectiveStatus(p) === activeTab);
  if (q) list = list.filter((p) => matchesSearch(p.studentName, q) || matchesSearch(p.studentDni, q) || matchesSearch(p.receiptNumber ?? "", q));
  if (filters.metodo) list = list.filter((p) => p.method === filters.metodo);
  if (filters.recibo) list = list.filter((p) => Boolean(p.receiptNumber) === (filters.recibo === "con"));
  if (filters.desde || filters.hasta) list = list.filter((p) => inDateRange(p.dueDate, filters.desde, filters.hasta));

  return { list, activeTab, filters, q };
}
