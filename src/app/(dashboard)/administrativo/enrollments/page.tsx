import Link from "next/link";
import { getEnrollments } from "@/modules/enrollments/services/enrollments.service";
import { EnrollmentList } from "@/modules/enrollments/components/EnrollmentList";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { Pagination } from "@/components/ui/TableControls";
import { LEVEL_ORDER } from "@/lib/level-labels";

import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";

const BASE_PATH = "/administrativo/enrollments";
const STATUS_ORDER = ["active", "completed", "withdrawn"];

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { q } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["student", "dni", "course", "level", "date", "status"],
    defaultSort: "date",
    defaultDir: "desc",
  });

  const enrollments = await getEnrollments(q);
  const sorted = sortRows(enrollments, query, {
    student: (e) => e.studentName,
    dni: (e) => e.studentDni,
    course: (e) => e.courseName,
    level: (e) => LEVEL_ORDER.indexOf(e.courseLevel),
    date: (e) => new Date(e.enrolledAt).getTime(),
    status: (e) => STATUS_ORDER.indexOf(e.status),
  });
  const page = paginate(sorted, query);
  const active = enrollments.filter((e) => e.status === "active").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inscripciones</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {active} activa{active !== 1 ? "s" : ""} de {enrollments.length} en total
          </p>
        </div>
        <Link href="/administrativo/enrollments/new" className={buttonVariants({ variant: "primary" })}>
          + Nueva inscripción
        </Link>
      </div>

      <SearchInput placeholder="Buscar por alumno, DNI o curso..." resultCount={enrollments.length} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <EnrollmentList enrollments={page.rows} showNewLink basePath={BASE_PATH} sort={{ basePath: BASE_PATH, searchParams: sp, query }} />
        <Pagination basePath={BASE_PATH} searchParams={sp} page={page} noun="inscripciones" />
      </div>
    </div>
  );
}
