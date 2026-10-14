import Link from "next/link";
import { getEnrollments } from "@/modules/enrollments/services/enrollments.service";
import { EnrollmentList } from "@/modules/enrollments/components/EnrollmentList";
import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const enrollments = await getEnrollments(q);
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
        <EnrollmentList enrollments={enrollments} showNewLink basePath="/administrativo/enrollments" />
      </div>
    </div>
  );
}
