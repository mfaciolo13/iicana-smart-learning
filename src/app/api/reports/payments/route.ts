import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPayments } from "@/modules/payments/services/payments.service";
import { filterPayments } from "@/modules/payments/lib/filters";
import { effectiveStatus } from "@/modules/payments/lib/buckets";
import { buildStyledReport, excelDate, EXCEL_FORMATS } from "@/lib/excel";
import { todayInstitute } from "@/lib/validation";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  overdue: "Vencido",
  suspended: "Suspendido",
  cancelled: "Anulado",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

/** Excel de pagos. Acepta los mismos parámetros que la pantalla (status, q, metodo, recibo, desde, hasta). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "director" && profile?.role !== "administrativo") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const { list: rows } = filterPayments(await getPayments(), sp);

  const headers = ["Alumno", "DNI", "Monto ($)", "Vencimiento", "Fecha pago", "Método", "Estado", "Nº Recibo"];
  const data = rows.map((r) => [
    r.studentName,
    r.studentDni,
    parseFloat(r.amount),
    excelDate(r.dueDate),
    excelDate(r.paidAt),
    r.method ? METHOD_LABELS[r.method] ?? r.method : "—",
    STATUS_LABELS[effectiveStatus(r)] ?? r.status,
    r.receiptNumber ?? "—",
  ] as (string | number | Date)[]);

  const buffer = buildStyledReport({
    title: "Smart Learning — Reporte de Pagos",
    headers,
    rows: data,
    colWidths: [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }],
    sheetName: "Pagos",
    formats: { 2: EXCEL_FORMATS.money, 3: EXCEL_FORMATS.date, 4: EXCEL_FORMATS.date },
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-pagos-${todayInstitute()}.xlsx"`,
    },
  });
}
