import { getUsers } from "@/modules/users/services/users.service";
import { UserList } from "@/modules/users/components/UserList";
import { Input } from "@/components/ui/Input";

const ROLE_TABS = [
  { value: "all", label: "Todos" },
  { value: "admin", label: "Admins" },
  { value: "profesor", label: "Docentes" },
  { value: "alumno", label: "Alumnos" },
  { value: "tutor", label: "Tutores" },
];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const { q, role } = await searchParams;
  const activeRole = role ?? "all";

  const allUsers = await getUsers(q);
  const filtered =
    activeRole === "all" ? allUsers : allUsers.filter((u) => u.role === activeRole);

  const counts = {
    admin: allUsers.filter((u) => u.role === "admin").length,
    profesor: allUsers.filter((u) => u.role === "profesor").length,
    alumno: allUsers.filter((u) => u.role === "alumno").length,
    tutor: allUsers.filter((u) => u.role === "tutor").length,
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Usuarios</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {allUsers.length} usuario{allUsers.length !== 1 ? "s" : ""} en el sistema
        </p>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Admins", value: counts.admin, color: "text-amber-600" },
          { label: "Docentes", value: counts.profesor, color: "text-blue-600" },
          { label: "Alumnos", value: counts.alumno, color: "text-emerald-600" },
          { label: "Tutores", value: counts.tutor, color: "text-violet-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + role filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form>
          <input type="hidden" name="role" value={activeRole === "all" ? "" : activeRole} />
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Buscar por nombre o email..."
            className="w-full sm:max-w-sm"
          />
        </form>

        <div className="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {ROLE_TABS.map((tab) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (tab.value !== "all") params.set("role", tab.value);
            return (
              <a
                key={tab.value}
                href={`/admin/users${params.toString() ? `?${params}` : ""}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeRole === tab.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <UserList users={filtered} />
      </div>
    </div>
  );
}
