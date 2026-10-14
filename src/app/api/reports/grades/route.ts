import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGradesReport } from "@/modules/reports/services/reports.service";
import { buildStyledReport, excelDate, EXCEL_FORMATS } from "@/lib/excel";
import { todayInstitute } from "@/lib/validation";

const EVAL_LABELS: Record<string, string> = {
  parcial: "Parcial",
  final: "Final",
  oral: "Oral",
  homework: "Tarea",
  quiz: "Quiz",
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "director" && profile?.role !== "administrativo") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const rows = await getGradesReport();

  const headers = ["Alumno", "DNI", "Curso", "Tipo evaluación", "Nota (1-10)", "Fecha", "Aprobado"];
  const data = rows.map((r) => [
    r.studentName,
    r.studentDni,
    r.courseName,
    EVAL_LABELS[r.evaluationType] ?? r.evaluationType,
    parseFloat(r.score),
    excelDate(r.evaluatedAt),
    parseFloat(r.score) >= 7 ? "Sí" : "No",
  ] as (string | number | Date)[]);

  const buffer = buildStyledReport({
    title: "Smart Learning — Reporte de Notas",
    headers,
    rows: data,
    colWidths: [{ wch: 30 }, { wch: 12 }, { wch: 25 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 10 }],
    sheetName: "Notas",
    formats: { 4: EXCEL_FORMATS.grade, 5: EXCEL_FORMATS.date },
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-notas-${todayInstitute()}.xlsx"`,
    },
  });
}
