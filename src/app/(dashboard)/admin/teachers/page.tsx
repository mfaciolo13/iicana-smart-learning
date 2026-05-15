import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TeacherList } from "@/modules/teachers/components/TeacherList";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data: teacherRows } = await supabase
    .from("teachers")
    .select("id, dni, specialization, profile_id");

  const profileIds = (teacherRows ?? []).map((t) => t.profile_id);
  const { data: profileRows } = profileIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
    : { data: [] as { id: string; full_name: string; email: string }[] };

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));

  let teachers = (teacherRows ?? [])
    .map((t) => {
      const profile = profileMap.get(t.profile_id);
      return {
        id: t.id,
        dni: t.dni,
        specialization: t.specialization as string | null,
        fullName: profile?.full_name ?? "",
        email: profile?.email ?? "",
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  if (q) {
    const lower = q.toLowerCase();
    teachers = teachers.filter(
      (t) =>
        t.fullName.toLowerCase().includes(lower) ||
        t.email.toLowerCase().includes(lower) ||
        t.dni.toLowerCase().includes(lower)
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Docentes</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {teachers.length} docente{teachers.length !== 1 ? "s" : ""} registrado{teachers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin/teachers/new" className={buttonVariants({ variant: "primary" })}>
          + Nuevo docente
        </Link>
      </div>

      <form className="mb-4">
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por nombre, email o DNI..."
          className="w-full sm:max-w-sm"
        />
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <TeacherList teachers={teachers} />
      </div>
    </div>
  );
}
