import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaymentsReport } from "@/modules/reports/services/reports.service";
import { buildStyledReport } from "@/lib/excel";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  overdue: "Vencido",
  suspended: "Suspendido",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await getPaymentsReport();

  const headers = ["Alumno", "DNI", "Monto ($)", "Vencimiento", "Fecha pago", "Método", "Estado", "Nº Recibo"];
  const data = rows.map((r) => [
    r.studentName,
    r.studentDni,
    parseFloat(r.amount),
    new Date(r.dueDate).toLocaleDateString("es-AR"),
    r.paidAt ? new Date(r.paidAt).toLocaleDateString("es-AR") : "—",
    r.method ? METHOD_LABELS[r.method] ?? r.method : "—",
    STATUS_LABELS[r.status] ?? r.status,
    r.receiptNumber ?? "—",
  ] as (string | number)[]);

  const buffer = buildStyledReport({
    title: "Smart Learning — Reporte de Pagos",
    headers,
    rows: data,
    colWidths: [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }],
    sheetName: "Pagos",
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="reporte-pagos.xlsx"',
    },
  });
}
