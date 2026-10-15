import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDelinquencyReport } from "@/modules/reports/services/reports.service";
import { buildStyledReport, excelDate, EXCEL_FORMATS } from "@/lib/excel";
import { todayInstitute } from "@/lib/validation";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "director" && profile?.role !== "administrativo") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const rows = await getDelinquencyReport();

  const headers = ["Alumno", "DNI", "Email", "Teléfono", "Cuotas vencidas", "Monto adeudado ($)", "Vencimiento más antiguo", "Días de atraso", "Acceso restringido"];
  const data = rows.map((r) => [
    r.studentName,
    r.studentDni,
    r.email,
    r.phone ?? "—",
    r.overdueCount,
    r.amountOwed,
    excelDate(r.oldestDueDate),
    r.daysLate,
    r.accessRestricted ? "Sí" : "No",
  ] as (string | number | Date)[]);

  const buffer = buildStyledReport({
    title: "Smart Learning — Reporte de Morosidad",
    headers,
    rows: data,
    colWidths: [{ wch: 30 }, { wch: 12 }, { wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 18 }],
    sheetName: "Morosidad",
    formats: { 5: EXCEL_FORMATS.money, 6: EXCEL_FORMATS.date },
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-morosidad-${todayInstitute()}.xlsx"`,
    },
  });
}
