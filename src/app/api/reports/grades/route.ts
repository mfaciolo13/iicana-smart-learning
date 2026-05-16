import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGradesReport } from "@/modules/reports/services/reports.service";
import { buildStyledReport } from "@/lib/excel";

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await getGradesReport();

  const headers = ["Alumno", "DNI", "Curso", "Tipo evaluación", "Nota (1-10)", "Fecha", "Aprobado"];
  const data = rows.map((r) => [
    r.studentName,
    r.studentDni,
    r.courseName,
    EVAL_LABELS[r.evaluationType] ?? r.evaluationType,
    parseFloat(r.score),
    new Date(r.evaluatedAt).toLocaleDateString("es-AR"),
    parseFloat(r.score) >= 7 ? "Sí" : "No",
  ] as (string | number)[]);

  const buffer = buildStyledReport({
    title: "Smart Learning — Reporte de Notas",
    headers,
    rows: data,
    colWidths: [{ wch: 30 }, { wch: 12 }, { wch: 25 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 10 }],
    sheetName: "Notas",
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="reporte-notas.xlsx"',
    },
  });
}
