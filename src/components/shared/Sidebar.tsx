"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  PenLine,
  LogOut,
  X,
  ShieldCheck,
  Sparkles,
  Medal,
  ClipboardCheck,
  Megaphone,
  Archive,
  UserCircle,
  UserPlus,
  Settings,
  ShieldAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  director: [
    { label: "Dashboard", href: "/director", icon: LayoutDashboard },
    { label: "Alumnos", href: "/director/students", icon: GraduationCap },
    { label: "Docentes", href: "/director/teachers", icon: UserCheck },
    { label: "Administrativos", href: "/director/users?role=administrativo", icon: UserPlus },
    { label: "Cursos", href: "/director/courses", icon: BookOpen },
    { label: "Inscripciones", href: "/director/enrollments", icon: ClipboardList },
    { label: "Asistencia", href: "/director/attendance", icon: CalendarCheck },
    { label: "Notas", href: "/director/grades", icon: Star },
    { label: "Pagos", href: "/director/payments", icon: CreditCard },
    { label: "Comunicaciones", href: "/director/notifications", icon: MessageSquare },
    { label: "Reclamos", href: "/director/complaints", icon: AlertCircle },
    { label: "Eval. Docentes", href: "/director/teacher-evaluations", icon: ClipboardCheck },
    { label: "Promociones", href: "/director/promotions", icon: Medal },
    { label: "Marketing", href: "/director/marketing", icon: Megaphone },
    { label: "Riesgo de Abandono", href: "/director/risk", icon: ShieldAlert },
    { label: "Cierre de Ciclo", href: "/director/year-end", icon: Archive },
    { label: "Reportes", href: "/director/reports", icon: BarChart2 },
    { label: "Material", href: "/director/documents", icon: BookOpen },
    { label: "Usuarios", href: "/director/users", icon: ShieldCheck },
    { label: "Autoevaluaciones IA", href: "/director/assessments", icon: Sparkles },
    { label: "Automatizaciones", href: "/director/settings/automations", icon: Zap },
    { label: "Notificaciones", href: "/director/settings/notifications", icon: Settings },
    { label: "Mi Perfil", href: "/director/profile", icon: UserCircle },
  ],
  administrativo: [
    { label: "Dashboard", href: "/administrativo", icon: LayoutDashboard },
    { label: "Alumnos", href: "/administrativo/students", icon: GraduationCap },
    { label: "Inscripciones", href: "/administrativo/enrollments", icon: ClipboardList },
    { label: "Asistencia", href: "/administrativo/attendance", icon: CalendarCheck },
    { label: "Notas", href: "/administrativo/grades", icon: Star },
    { label: "Pagos", href: "/administrativo/payments", icon: CreditCard },
    { label: "Comunicaciones", href: "/administrativo/notifications", icon: MessageSquare },
    { label: "Reclamos", href: "/administrativo/complaints", icon: AlertCircle },
    { label: "Reportes", href: "/administrativo/reports", icon: BarChart2 },
    { label: "Mi Perfil", href: "/administrativo/profile", icon: UserCircle },
  ],
  profesor: [
    { label: "Mis Cursos", href: "/profesor", icon: BookOpen },
    { label: "Asistencia", href: "/profesor/attendance", icon: CalendarCheck },
    { label: "Cargar Notas", href: "/profesor/grades", icon: PenLine },
    { label: "Autoevaluaciones IA", href: "/profesor/assessments", icon: Sparkles },
    { label: "Mensajes", href: "/profesor/notifications", icon: MessageSquare },
    { label: "Material", href: "/profesor/documents", icon: BookOpen },
    { label: "Mi Perfil", href: "/profesor/profile", icon: UserCircle },
  ],
  alumno: [
    { label: "Inicio", href: "/alumno", icon: Home },
    { label: "Mis Notas", href: "/alumno/grades", icon: Award },
    { label: "Asistencia", href: "/alumno/attendance", icon: CalendarCheck },
    { label: "Evaluar Docente", href: "/alumno/evaluations", icon: Star },
    { label: "Autoevaluaciones", href: "/alumno/assessments", icon: Sparkles },
    { label: "Pagos", href: "/alumno/payments", icon: CreditCard },
    { label: "Material", href: "/alumno/documents", icon: BookOpen },
    { label: "Mensajes", href: "/alumno/notifications", icon: MessageSquare },
    { label: "Reclamos", href: "/alumno/complaints", icon: AlertCircle },
    { label: "Mi Perfil", href: "/alumno/profile", icon: UserCircle },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  director: "Director",
  administrativo: "Administrativo",
  profesor: "Docente",
  alumno: "Alumno",
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
  avatarUrl?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role, fullName, avatarUrl, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="10,2 18,6.5 10,11 2,6.5" fill="white"/>
              <path d="M4 8v3.5C4 14.5 7 16 10 16s6-1.5 6-4.5V8Z" fill="white" fillOpacity="0.3"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Smart Learning</p>
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
          // rootHref is the dashboard item — match exactly to avoid false positives
          const rootHref = items[0].href;
          const [hrefPath, hrefQuery] = item.href.split("?");
          const isActive =
            item.href === rootHref
              ? pathname === hrefPath
              : hrefQuery
              ? pathname === hrefPath && new URLSearchParams(hrefQuery).get("role") === searchParams.get("role")
              : pathname.startsWith(hrefPath);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
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
        <Link
          href={`/${role}/profile`}
          prefetch={false}
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/5 mb-1 hover:bg-white/10 transition-colors"
        >
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={avatarUrl ? undefined : { background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              getInitials(fullName)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{fullName}</p>
            <p className="text-[10px] text-white/40 truncate">{ROLE_LABELS[role]}</p>
          </div>
        </Link>
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
