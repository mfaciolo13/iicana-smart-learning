import Link from "next/link";
import { UserPlus } from "lucide-react";
import { db } from "@/lib/drizzle";
import { profiles } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import { UserList } from "@/modules/users/components/UserList";
import type { UserListItem } from "@/modules/users/types";
import { SearchInput } from "@/components/ui/SearchInput";
import { matchesSearch } from "@/lib/search";

const ROLE_TABS = [
  { value: "all", label: "Todos" },
  { value: "director", label: "Directores" },
  { value: "administrativo", label: "Administrativos" },
  { value: "profesor", label: "Docentes" },
  { value: "alumno", label: "Alumnos" },
];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const { q, role } = await searchParams;
  const activeRole = role ?? "all";

  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      role: profiles.role,
      fullName: profiles.fullName,
      phone: profiles.phone,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .orderBy(asc(profiles.fullName));

  const allUsers: UserListItem[] = rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role as UserListItem["role"],
    fullName: r.fullName,
    phone: r.phone ?? null,
    createdAt: new Date(r.createdAt),
  }));

  const searched = q
    ? allUsers.filter(
        (u) => matchesSearch(u.fullName, q) || matchesSearch(u.email, q)
      )
    : allUsers;

  const filtered =
    activeRole === "all" ? searched : searched.filter((u) => u.role === activeRole);

  const counts = {
    director: allUsers.filter((u) => u.role === "director").length,
    administrativo: allUsers.filter((u) => u.role === "administrativo").length,
    profesor: allUsers.filter((u) => u.role === "profesor").length,
    alumno: allUsers.filter((u) => u.role === "alumno").length,
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Usuarios</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {allUsers.length} usuario{allUsers.length !== 1 ? "s" : ""} en el sistema
          </p>
        </div>
        <Link
          href="/director/users/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-700 text-white text-sm font-medium hover:bg-brand-800 transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo administrativo
        </Link>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Directores", value: counts.director, color: "text-amber-600" },
          { label: "Administrativos", value: counts.administrativo, color: "text-purple-600" },
          { label: "Docentes", value: counts.profesor, color: "text-blue-600" },
          { label: "Alumnos", value: counts.alumno, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + role filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput placeholder="Buscar por nombre o email..." resultCount={filtered.length} />

        <div className="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {ROLE_TABS.map((tab) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (tab.value !== "all") params.set("role", tab.value);
            return (
              <a
                key={tab.value}
                href={`/director/users${params.toString() ? `?${params}` : ""}`}
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
