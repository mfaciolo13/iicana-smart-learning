import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getPaymentsReport } from "@/modules/reports/services/reports.service";

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

  const rows = await getPaymentsReport();

  const data = rows.map((r) => ({
    Alumno: r.studentName,
    DNI: r.studentDni,
    "Monto ($)": parseFloat(r.amount),
    Vencimiento: new Date(r.dueDate).toLocaleDateString("es-AR"),
    "Fecha pago": r.paidAt ? new Date(r.paidAt).toLocaleDateString("es-AR") : "—",
    Método: r.method ? METHOD_LABELS[r.method] ?? r.method : "—",
    Estado: STATUS_LABELS[r.status] ?? r.status,
    "Nº Recibo": r.receiptNumber ?? "—",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "Pagos");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="reporte-pagos.xlsx"',
    },
  });
}
