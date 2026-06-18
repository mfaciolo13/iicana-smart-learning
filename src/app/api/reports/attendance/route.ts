import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceReport } from "@/modules/reports/services/reports.service";
import { buildStyledReport } from "@/lib/excel";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "director") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const rows = await getAttendanceReport();

  const headers = ["Alumno", "DNI", "Curso", "Total clases", "Presentes", "Ausentes", "Tardanzas", "% Asistencia"];
  const data = rows.map((r) => [
    r.studentName,
    r.studentDni,
    r.courseName,
    r.total,
    r.present,
    r.absent,
    r.late,
    r.pct,
  ] as (string | number)[]);

  const buffer = buildStyledReport({
    title: "Smart Learning — Reporte de Asistencia",
    headers,
    rows: data,
    colWidths: [{ wch: 30 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }],
    sheetName: "Asistencia",
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="reporte-asistencia.xlsx"',
    },
  });
}
