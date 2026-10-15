import { createClient } from "@/lib/supabase/server";
import { getGrades } from "@/modules/grades/services/grades.service";
import { GradesListPage } from "@/modules/grades/components/GradesListPage";

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [grades, { data: coursesData }] = await Promise.all([getGrades(), supabase.from("courses").select("name").order("name")]);

  return <GradesListPage sp={sp} basePath="/administrativo/grades" grades={grades} courseNames={(coursesData ?? []).map((c) => c.name)} />;
}
