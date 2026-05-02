import Link from "next/link";
import { getCourses } from "@/modules/courses/services/courses.service";
import { CourseList } from "@/modules/courses/components/CourseList";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const courses = await getCourses(q);

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
        <Link href="/admin/courses/new" className={buttonVariants({ variant: "primary" })}>
          + Nuevo curso
        </Link>
      </div>

      <form className="mb-4">
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por nombre..."
          className="w-full sm:max-w-sm"
        />
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <CourseList courses={courses} />
      </div>
    </div>
  );
}
