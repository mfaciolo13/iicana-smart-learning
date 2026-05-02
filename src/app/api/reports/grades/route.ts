import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getGradesReport } from "@/modules/reports/services/reports.service";

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

  const data = rows.map((r) => ({
    Alumno: r.studentName,
    DNI: r.studentDni,
    Curso: r.courseName,
    "Tipo evaluación": EVAL_LABELS[r.evaluationType] ?? r.evaluationType,
    Nota: parseFloat(r.score),
    Fecha: new Date(r.evaluatedAt).toLocaleDateString("es-AR"),
    Aprobado: parseFloat(r.score) >= 7 ? "Sí" : "No",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 25 }, { wch: 16 }, { wch: 6 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws, "Notas");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="reporte-notas.xlsx"',
    },
  });
}
