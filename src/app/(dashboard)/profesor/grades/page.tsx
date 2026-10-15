import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { getGradesByTeacherProfile } from "@/modules/grades/services/grades.service";
import { GradesListPage } from "@/modules/grades/components/GradesListPage";

export default async function ProfesorGradesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const supabase = await createClient();

  const { data: teacherRow } = await supabase.from("teachers").select("id, courses(id, name)").eq("profile_id", user.id).single();
  if (!teacherRow) redirect("/login");

  const myCourses = (teacherRow.courses as unknown as { id: string; name: string }[] | null) ?? [];
  // Sólo notas de sus cursos (getGradesByTeacherProfile ya las limita al docente).
  const grades = await getGradesByTeacherProfile(user.id);

  return (
    <GradesListPage
      sp={sp}
      basePath="/profesor/grades"
      grades={grades}
      courseNames={myCourses.map((c) => c.name).sort((a, b) => a.localeCompare(b, "es"))}
      newHref="/profesor/grades/new"
    />
  );
}
