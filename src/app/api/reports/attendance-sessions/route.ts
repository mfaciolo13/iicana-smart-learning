import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceSessions } from "@/modules/attendance/services/attendance-sessions.service";
import { buildSessionFilterFields, filterSessions, sessionPct } from "@/modules/attendance/lib/filters";
import { buildStyledReport, excelDate, EXCEL_FORMATS } from "@/lib/excel";
import { todayInstitute } from "@/lib/validation";

/** Excel de clases con asistencia. Acepta los mismos parámetros que la pantalla (curso, desde, hasta, asistencia). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "director" && profile?.role !== "administrativo") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const all = await getAttendanceSessions();
  const { list: rows } = filterSessions(all, sp, buildSessionFilterFields(all));

  const headers = ["Fecha", "Curso", "Total", "Presentes", "Ausentes", "Tardanzas", "% Asistencia"];
  const data = rows.map((s) => [excelDate(s.classDate), s.courseName, s.total, s.present, s.absent, s.late, sessionPct(s)] as (string | number | Date)[]);

  const buffer = buildStyledReport({
    title: "Smart Learning — Clases con asistencia",
    headers,
    rows: data,
    colWidths: [{ wch: 14 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }],
    sheetName: "Clases",
    formats: { 0: EXCEL_FORMATS.date, 6: EXCEL_FORMATS.percent },
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="clases-asistencia-${todayInstitute()}.xlsx"`,
    },
  });
}
