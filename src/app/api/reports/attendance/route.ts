import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceReport } from "@/modules/reports/services/reports.service";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getAttendanceReport();

  const data = rows.map((r) => ({
    Alumno: r.studentName,
    DNI: r.studentDni,
    Curso: r.courseName,
    "Total clases": r.total,
    Presentes: r.present,
    Ausentes: r.absent,
    Tardanzas: r.late,
    "% Asistencia": r.pct,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="reporte-asistencia.xlsx"',
    },
  });
}
