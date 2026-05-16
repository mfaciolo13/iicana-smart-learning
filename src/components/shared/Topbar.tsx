"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Menu, LogOut, UserCircle } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/modules/auth/actions";
import { createClient } from "@/lib/supabase/client";
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
  avatarUrl?: string | null;
  userId: string;
  initialUnreadCount: number;
  onMenuClick?: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  profesor: "Docente",
  alumno: "Alumno",
};

export function Topbar({ fullName, role, avatarUrl, userId, initialUnreadCount, onMenuClick }: TopbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifs-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => { setUnreadCount((c) => c + 1); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      <div className="flex-1" />

      {/* Notification bell */}
      <Link
        href={`/${role}/notifications`}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-4.5 h-4.5" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>

      <div className="w-px h-5 bg-slate-200" />

      {/* User avatar + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 hover:bg-slate-50 transition-colors"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-none">{fullName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{ROLE_LABELS[role]}</p>
          </div>
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={avatarUrl ? undefined : { background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              getInitials(fullName)
            )}
          </div>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50">
            {/* Header — clicking name/role goes to profile */}
            <Link
              href={`/${role}/profile`}
              onClick={() => setDropdownOpen(false)}
              className="block px-4 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors rounded-t-xl"
            >
              <p className="text-xs font-semibold text-slate-800 truncate">{fullName}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{ROLE_LABELS[role]}</p>
            </Link>

            {/* Mi Perfil */}
            <Link
              href={`/${role}/profile`}
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <UserCircle className="w-4 h-4 shrink-0 text-slate-400" />
              Mi Perfil
            </Link>

            <div className="border-t border-slate-100 my-0.5" />

            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Cerrar sesión
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
