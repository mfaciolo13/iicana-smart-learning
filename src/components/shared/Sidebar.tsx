"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/modules/auth/actions";
import type { UserRole } from "@/modules/auth/types";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin" },
    { label: "Alumnos", href: "/admin/students" },
    { label: "Docentes", href: "/admin/teachers" },
    { label: "Cursos", href: "/admin/courses" },
    { label: "Inscripciones", href: "/admin/enrollments" },
    { label: "Asistencia", href: "/admin/attendance" },
    { label: "Notas", href: "/admin/grades" },
    { label: "Pagos", href: "/admin/payments" },
    { label: "Notificaciones", href: "/admin/notifications" },
    { label: "Reclamos", href: "/admin/complaints" },
    { label: "Reportes", href: "/admin/reports" },
    { label: "Usuarios", href: "/admin/users" },
  ],
  profesor: [
    { label: "Dashboard", href: "/profesor" },
    { label: "Mis Cursos", href: "/profesor/courses" },
    { label: "Asistencia", href: "/profesor/attendance" },
    { label: "Notas", href: "/profesor/grades" },
    { label: "Notificaciones", href: "/profesor/notifications" },
  ],
  alumno: [
    { label: "Dashboard", href: "/alumno" },
    { label: "Mi Curso", href: "/alumno/course" },
    { label: "Asistencia", href: "/alumno/attendance" },
    { label: "Notas", href: "/alumno/grades" },
    { label: "Pagos", href: "/alumno/payments" },
    { label: "Notificaciones", href: "/alumno/notifications" },
    { label: "Reclamos", href: "/alumno/complaints" },
  ],
  tutor: [
    { label: "Dashboard", href: "/tutor" },
    { label: "Mi Alumno", href: "/tutor/student" },
    { label: "Asistencia", href: "/tutor/attendance" },
    { label: "Notas", href: "/tutor/grades" },
    { label: "Pagos", href: "/tutor/payments" },
    { label: "Notificaciones", href: "/tutor/notifications" },
  ],
};

interface SidebarProps {
  role: UserRole;
  fullName: string;
}

export function Sidebar({ role, fullName }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];

  const roleLabel: Record<UserRole, string> = {
    admin: "Administrador",
    profesor: "Docente",
    alumno: "Alumno",
    tutor: "Tutor",
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-lg font-bold text-blue-700">IICANA</h1>
        <p className="text-xs text-gray-400 mt-0.5">Smart Learning</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const isActive =
            item.href === `/${role}`
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-800 truncate">
            {fullName}
          </p>
          <p className="text-xs text-gray-400">{roleLabel[role]}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full text-left text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
