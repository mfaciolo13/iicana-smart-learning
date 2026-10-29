"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import type { UserRole } from "@/modules/auth/types";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
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
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  /** Rótulo en versalitas sobre el grupo; el primer grupo (inicio) va sin rótulo. */
  label?: string;
  items: NavItem[];
}

const NAV: Record<UserRole, NavGroup[]> = {
  director: [
    { items: [{ label: "Dashboard", href: "/director", icon: LayoutDashboard }] },
    {
      label: "Académico",
      items: [
        { label: "Alumnos", href: "/director/students", icon: GraduationCap },
        { label: "Docentes", href: "/director/teachers", icon: UserCheck },
        { label: "Cursos", href: "/director/courses", icon: BookOpen },
        { label: "Inscripciones", href: "/director/enrollments", icon: ClipboardList },
        { label: "Asistencia", href: "/director/attendance", icon: CalendarCheck },
        { label: "Notas", href: "/director/grades", icon: Star },
        { label: "Promociones", href: "/director/promotions", icon: Medal },
        { label: "Material", href: "/director/documents", icon: FolderOpen },
        { label: "Autoevaluaciones IA", href: "/director/assessments", icon: Sparkles },
      ],
    },
    {
      label: "Administración",
      items: [
        { label: "Pagos", href: "/director/payments", icon: CreditCard },
        { label: "Comunicaciones", href: "/director/notifications", icon: MessageSquare },
        { label: "Reclamos", href: "/director/complaints", icon: AlertCircle },
        { label: "Reportes", href: "/director/reports", icon: BarChart2 },
        { label: "Marketing", href: "/director/marketing", icon: Megaphone },
        { label: "Riesgo de Abandono", href: "/director/risk", icon: ShieldAlert },
      ],
    },
    {
      label: "Dirección",
      items: [
        { label: "Eval. Docentes", href: "/director/teacher-evaluations", icon: ClipboardCheck },
        { label: "Cierre de Ciclo", href: "/director/year-end", icon: Archive },
        { label: "Administrativos", href: "/director/users?role=administrativo", icon: UserPlus },
        { label: "Usuarios", href: "/director/users", icon: ShieldCheck },
      ],
    },
    {
      label: "Sistema",
      items: [
        { label: "Automatizaciones", href: "/director/settings/automations", icon: Zap },
        { label: "Notificaciones", href: "/director/settings/notifications", icon: Settings },
        { label: "Mi Perfil", href: "/director/profile", icon: UserCircle },
      ],
    },
  ],
  administrativo: [
    { items: [{ label: "Dashboard", href: "/administrativo", icon: LayoutDashboard }] },
    {
      label: "Académico",
      items: [
        { label: "Alumnos", href: "/administrativo/students", icon: GraduationCap },
        { label: "Cursos", href: "/administrativo/courses", icon: BookOpen },
        { label: "Inscripciones", href: "/administrativo/enrollments", icon: ClipboardList },
        { label: "Asistencia", href: "/administrativo/attendance", icon: CalendarCheck },
        { label: "Notas", href: "/administrativo/grades", icon: Star },
      ],
    },
    {
      label: "Administración",
      items: [
        { label: "Pagos", href: "/administrativo/payments", icon: CreditCard },
        { label: "Comunicaciones", href: "/administrativo/notifications", icon: MessageSquare },
        { label: "Reclamos", href: "/administrativo/complaints", icon: AlertCircle },
        { label: "Reportes", href: "/administrativo/reports", icon: BarChart2 },
      ],
    },
    { label: "Cuenta", items: [{ label: "Mi Perfil", href: "/administrativo/profile", icon: UserCircle }] },
  ],
  profesor: [
    { items: [{ label: "Mis Cursos", href: "/profesor", icon: BookOpen }] },
    {
      label: "Clases",
      items: [
        { label: "Asistencia", href: "/profesor/attendance", icon: CalendarCheck },
        { label: "Cargar Notas", href: "/profesor/grades", icon: PenLine },
        { label: "Autoevaluaciones IA", href: "/profesor/assessments", icon: Sparkles },
        { label: "Material", href: "/profesor/documents", icon: FolderOpen },
      ],
    },
    {
      label: "Cuenta",
      items: [
        { label: "Mensajes", href: "/profesor/notifications", icon: MessageSquare },
        { label: "Mi Perfil", href: "/profesor/profile", icon: UserCircle },
      ],
    },
  ],
  alumno: [
    { items: [{ label: "Inicio", href: "/alumno", icon: Home }] },
    {
      label: "Mi cursada",
      items: [
        { label: "Mis Cursos", href: "/alumno/courses", icon: GraduationCap },
        { label: "Mis Notas", href: "/alumno/grades", icon: Award },
        { label: "Asistencia", href: "/alumno/attendance", icon: CalendarCheck },
        { label: "Autoevaluaciones", href: "/alumno/assessments", icon: Sparkles },
        { label: "Material", href: "/alumno/documents", icon: FolderOpen },
      ],
    },
    {
      label: "Instituto",
      items: [
        { label: "Pagos", href: "/alumno/payments", icon: CreditCard },
        { label: "Mensajes", href: "/alumno/notifications", icon: MessageSquare },
        { label: "Reclamos", href: "/alumno/complaints", icon: AlertCircle },
        { label: "Evaluar Docente", href: "/alumno/evaluations", icon: Star },
      ],
    },
    { label: "Cuenta", items: [{ label: "Mi Perfil", href: "/alumno/profile", icon: UserCircle }] },
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
  const groups = NAV[role];
  const allItems = groups.flatMap((g) => g.items);
  // El ítem de inicio sólo se marca con coincidencia exacta, para no "pisar" al resto.
  const rootHref = allItems[0].href;

  function isActive(item: NavItem) {
    const [hrefPath, hrefQuery] = item.href.split("?");
    if (item.href === rootHref) return pathname === hrefPath;
    if (hrefQuery) {
      return pathname === hrefPath && new URLSearchParams(hrefQuery).get("role") === searchParams.get("role");
    }
    // "Usuarios" y "Administrativos" comparten path: el genérico no se marca cuando hay ?role=.
    const hasQuerySibling = allItems.some((o) => o !== item && o.href.startsWith(`${hrefPath}?`));
    if (hasQuerySibling && searchParams.get("role")) return false;
    return pathname.startsWith(hrefPath);
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-slate-50 border-r border-slate-200 transition-transform duration-200 ease-in-out",
        "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
      aria-label="Menú principal"
    >
      {/* Logo + cerrar (mobile) */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <Link href={rootHref} prefetch={false} onClick={onClose} className="inline-flex">
          <Logo size={30} textClassName="text-[15px]" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navegación agrupada */}
      <nav className="flex-1 px-3 pb-3 space-y-5 overflow-y-auto" aria-label="Navegación principal">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi}>
            {group.label && (
              <p className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors",
                        active
                          ? "bg-white text-slate-900 font-semibold shadow-sm ring-1 ring-slate-200 before:absolute before:-left-3 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-brand-700 before:content-['']"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          active ? "text-brand-700" : "text-slate-400 group-hover:text-slate-600"
                        )}
                        strokeWidth={active ? 2.25 : 1.75}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Usuario */}
      <div className="px-3 pb-4 pt-3 border-t border-slate-200">
        <Link
          href={`/${role}/profile`}
          prefetch={false}
          onClick={onClose}
          className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-50 bg-brand-700 shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              getInitials(fullName)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{fullName}</p>
            <p className="text-[10.5px] text-slate-400 truncate">{ROLE_LABELS[role]}</p>
          </div>
        </Link>
        <LogoutButton className="mt-0.5 px-2.5 py-2 rounded-lg text-xs text-slate-500 hover:bg-red-50 hover:text-red-700" />
      </div>
    </aside>
  );
}
