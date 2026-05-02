"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/modules/auth/actions";
import type { UserRole } from "@/modules/auth/types";
import { cn } from "@/lib/cn";
import {
  LayoutDashboard,
  GraduationCap,
  UserCheck,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  Star,
  CreditCard,
  MessageSquare,
  AlertCircle,
  BarChart2,
  Home,
  Award,
  Users,
  PenLine,
  LogOut,
  X,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Alumnos", href: "/admin/students", icon: GraduationCap },
    { label: "Docentes", href: "/admin/teachers", icon: UserCheck },
    { label: "Cursos", href: "/admin/courses", icon: BookOpen },
    { label: "Inscripciones", href: "/admin/enrollments", icon: ClipboardList },
    { label: "Asistencia", href: "/admin/attendance", icon: CalendarCheck },
    { label: "Notas", href: "/admin/grades", icon: Star },
    { label: "Pagos", href: "/admin/payments", icon: CreditCard },
    { label: "Comunicaciones", href: "/admin/notifications", icon: MessageSquare },
    { label: "Reclamos", href: "/admin/complaints", icon: AlertCircle },
    { label: "Reportes", href: "/admin/reports", icon: BarChart2 },
    { label: "Usuarios", href: "/admin/users", icon: ShieldCheck },
    { label: "Autoevaluaciones IA", href: "/admin/assessments", icon: Sparkles },
  ],
  profesor: [
    { label: "Mis Cursos", href: "/profesor", icon: BookOpen },
    { label: "Asistencia", href: "/profesor/attendance", icon: CalendarCheck },
    { label: "Cargar Notas", href: "/profesor/grades", icon: PenLine },
    { label: "Mensajes", href: "/profesor/notifications", icon: MessageSquare },
    { label: "Mi Perfil", href: "/profesor/profile", icon: UserCheck },
  ],
  alumno: [
    { label: "Inicio", href: "/alumno", icon: Home },
    { label: "Mis Notas", href: "/alumno/grades", icon: Award },
    { label: "Asistencia", href: "/alumno/attendance", icon: CalendarCheck },
    { label: "Autoevaluaciones", href: "/alumno/assessments", icon: Sparkles },
    { label: "Pagos", href: "/alumno/payments", icon: CreditCard },
    { label: "Mensajes", href: "/alumno/notifications", icon: MessageSquare },
  ],
  tutor: [
    { label: "Inicio", href: "/tutor", icon: Home },
    { label: "Mis Hijos/as", href: "/tutor/student", icon: Users },
    { label: "Pagos", href: "/tutor/payments", icon: CreditCard },
    { label: "Mensajes", href: "/tutor/notifications", icon: MessageSquare },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  profesor: "Docente",
  alumno: "Alumno",
  tutor: "Tutor",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

interface SidebarProps {
  role: UserRole;
  fullName: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role, fullName, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col w-64 min-h-screen shrink-0 border-r border-white/5 transition-transform duration-200 ease-in-out",
        "lg:relative lg:translate-x-0 lg:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
      style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)" }}
      aria-label="Menú principal"
    >
      {/* Logo + close button */}
      <div className="px-6 pt-6 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
          >
            I
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">IICANA</p>
            <p className="text-[10px] text-white/40 mt-0.5 leading-none">Smart Learning</p>
          </div>
        </div>
        {/* Close button — only visible on mobile */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto" aria-label="Navegación principal">
        {items.map((item) => {
          const isActive =
            item.href === `/${role}`
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/50 hover:bg-white/5 hover:text-white/90"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-blue-400" : "text-white/40 group-hover:text-white/70"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 pt-2 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/5 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            {getInitials(fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{fullName}</p>
            <p className="text-[10px] text-white/40 truncate">{ROLE_LABELS[role]}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
