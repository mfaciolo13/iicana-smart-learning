import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGrades } from "@/modules/grades/services/grades.service";
import { GRADE_TYPE_LABELS, buildGradeFilterFields, filterGrades } from "@/modules/grades/lib/filters";
import { buildStyledReport, excelDate, EXCEL_FORMATS } from "@/lib/excel";
import { instituteDay } from "@/lib/filters";
import { todayInstitute } from "@/lib/validation";

/** Excel de notas. Acepta los mismos parámetros que la pantalla (q, curso, tipo, resultado, desde, hasta). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "director" && profile?.role !== "administrativo") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const all = await getGrades();
  const courseNames = [...new Set(all.map((g) => g.courseName))].sort((a, b) => a.localeCompare(b, "es"));
  const { list: rows } = filterGrades(all, sp, buildGradeFilterFields(courseNames));

  const headers = ["Alumno", "DNI", "Curso", "Tipo evaluación", "Nota (1-10)", "Fecha", "Aprobado"];
  const data = rows.map((r) => [
    r.studentName,
    r.studentDni,
    r.courseName,
    GRADE_TYPE_LABELS[r.evaluationType] ?? r.evaluationType,
    parseFloat(r.score),
    excelDate(instituteDay(r.evaluatedAt)),
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
