import Link from "next/link";
import type { UserListItem } from "../types";
import { Badge } from "@/components/ui/Badge";

const ROLE_CONFIG: Record<string, { label: string; variant: "info" | "success" | "warning" | "neutral" }> = {
  admin: { label: "Admin", variant: "warning" },
  profesor: { label: "Docente", variant: "info" },
  alumno: { label: "Alumno", variant: "success" },
  tutor: { label: "Tutor", variant: "neutral" },
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const AVATAR_GRADIENTS: Record<string, string> = {
  admin: "linear-gradient(135deg, #f59e0b, #d97706)",
  profesor: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  alumno: "linear-gradient(135deg, #10b981, #059669)",
  tutor: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
};

interface UserListProps {
  users: UserListItem[];
}

export function UserList({ users }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">Sin usuarios</p>
        <p className="text-sm text-slate-400 mt-1">No se encontraron usuarios.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b-2 border-brand-700">
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Usuario</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden md:table-cell">Email</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Rol</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden sm:table-cell">Alta</th>
            <th className="py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => {
            const roleCfg = ROLE_CONFIG[u.role] ?? { label: u.role, variant: "neutral" as const };
            return (
              <tr key={u.id} className="hover:bg-brand-50 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: AVATAR_GRADIENTS[u.role] ?? "linear-gradient(135deg,#64748b,#475569)" }}
                    >
                      {getInitials(u.fullName)}
                    </div>
                    <span className="font-medium text-slate-900">{u.fullName}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-500 hidden md:table-cell">{u.email}</td>
                <td className="py-3 pr-4">
                  <Badge variant={roleCfg.variant} dot={false}>{roleCfg.label}</Badge>
                </td>
                <td className="py-3 pr-4 text-slate-400 text-xs hidden sm:table-cell">
                  {new Date(u.createdAt).toLocaleDateString("es-AR")}
                </td>
                <td className="py-3 text-right">
                  <Link href={`/admin/users/${u.id}`} className="text-brand-700 hover:underline text-xs font-medium">
                    Ver →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
