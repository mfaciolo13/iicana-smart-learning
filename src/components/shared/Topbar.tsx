"use client";

import { Bell, Menu } from "lucide-react";
import type { UserRole } from "@/modules/auth/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

interface TopbarProps {
  fullName: string;
  role: UserRole;
  onMenuClick?: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  profesor: "Docente",
  alumno: "Alumno",
  tutor: "Tutor",
};

export function Topbar({ fullName, role, onMenuClick }: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center gap-3 px-4 sm:px-6 shrink-0">
      {/* Hamburger — only on mobile */}
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" strokeWidth={2} />
      </button>

      {/* Push everything else to the right */}
      <div className="flex-1" />

      {/* Notification bell */}
      <button
        type="button"
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200" />

      {/* User */}
      <div className="flex items-center gap-2.5">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-semibold text-slate-800 leading-none">{fullName}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{ROLE_LABELS[role]}</p>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
        >
          {getInitials(fullName)}
        </div>
      </div>
    </header>
  );
}
