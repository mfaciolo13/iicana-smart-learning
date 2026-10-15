import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFilteredStudents } from "@/modules/students/services/student-list.service";
import { buildStyledReport } from "@/lib/excel";
import { LEVEL_LABELS } from "@/lib/level-labels";
import { todayInstitute } from "@/lib/validation";

const STATUS_LABELS: Record<string, string> = { active: "Activo", suspended: "Suspendido", inactive: "Inactivo", graduated: "Egresado" };

/** Excel de alumnos. Acepta los mismos parámetros que la pantalla (q, nivel, estado, curso, deuda). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "director" && profile?.role !== "administrativo") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const { students } = await getFilteredStudents(sp);
  const rows = [...students].sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));

  const headers = ["Alumno", "DNI", "Email", "Nivel", "Estado"];
  const data = rows.map((s) => [
    s.fullName,
    s.dni,
    s.email,
    s.level ? LEVEL_LABELS[s.level] ?? s.level : "Sin nivel",
    STATUS_LABELS[s.status] ?? s.status,
  ] as (string | number)[]);

  const buffer = buildStyledReport({
    title: "Smart Learning — Reporte de Alumnos",
    headers,
    rows: data,
    colWidths: [{ wch: 30 }, { wch: 12 }, { wch: 34 }, { wch: 18 }, { wch: 14 }],
    sheetName: "Alumnos",
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-alumnos-${todayInstitute()}.xlsx"`,
    },
  });
}
