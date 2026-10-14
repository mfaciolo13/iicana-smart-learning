import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CourseList } from "@/modules/courses/components/CourseList";
import { buttonVariants } from "@/components/ui/Button";
import type { CourseListItem } from "@/modules/courses/types";
import { SearchInput } from "@/components/ui/SearchInput";
import { matchesSearch } from "@/lib/search";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const [{ data: coursesData }, { data: enrollData }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, level, schedule, status, max_capacity, teachers(profiles(full_name))")
      .order("name"),
    supabase.from("enrollments").select("course_id").eq("status", "active"),
  ]);

  const enrollmentCounts = new Map<string, number>();
  for (const e of enrollData ?? []) {
    enrollmentCounts.set(e.course_id, (enrollmentCounts.get(e.course_id) ?? 0) + 1);
  }

  let courses: CourseListItem[] = (coursesData ?? []).map((c) => {
    const teacher = c.teachers as unknown as { profiles: { full_name: string } | null } | null;
    return {
      id: c.id,
      name: c.name,
      level: c.level as CourseListItem["level"],
      schedule: c.schedule,
      status: c.status as CourseListItem["status"],
      maxCapacity: c.max_capacity,
      teacherName: teacher?.profiles?.full_name ?? null,
      enrollmentCount: enrollmentCounts.get(c.id) ?? 0,
    };
  });

  if (q) {
    courses = courses.filter((c) => matchesSearch(c.name, q));
  }

  const active = courses.filter((c) => c.status === "active").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cursos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {active} activo{active !== 1 ? "s" : ""} de {courses.length} en total
          </p>
        </div>
        <Link href="/director/courses/new" className={buttonVariants({ variant: "primary" })}>
          + Nuevo curso
        </Link>
      </div>

      <SearchInput placeholder="Buscar por nombre..." resultCount={courses.length} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <CourseList courses={courses} />
      </div>
    </div>
  );
}
