"use client";

import { useId, useState, useRef, useEffect } from "react";
import { Bell, Menu, UserCircle } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { getInitials } from "@/lib/initials";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/modules/auth/types";


interface TopbarProps {
  fullName: string;
  role: UserRole;
  avatarUrl?: string | null;
  userId: string;
  initialUnreadCount: number;
  onMenuClick?: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  director: "Director",
  administrativo: "Administrativo",
  profesor: "Docente",
  alumno: "Alumno",
};

export function Topbar({ fullName, role, avatarUrl, userId, initialUnreadCount, onMenuClick }: TopbarProps) {
  const dropdownId = useId();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <header className="sticky top-0 z-30 h-14 bg-slate-50/85 backdrop-blur-md border-b border-slate-200 flex items-center gap-2 px-4 sm:px-6 shrink-0">
      {/* Hamburguesa — sólo mobile */}
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" strokeWidth={2} />
      </button>

      <div className="flex-1" />

      {/* Campana */}
      <Link
        href={`/${role}/notifications`}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-4.5 h-4.5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-slate-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Usuario + menú */}
      <div
        className="relative"
        ref={dropdownRef}
        onKeyDown={(event) => {
          if (event.key === "Escape" && dropdownOpen) {
            event.stopPropagation();
            setDropdownOpen(false);
            dropdownRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
          }
        }}
      >
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg pl-2 pr-1 py-1 hover:bg-slate-100 transition-colors"
          aria-expanded={dropdownOpen}
          aria-label={`Menú de usuario de ${fullName}`}
          aria-controls={dropdownId}
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 leading-none">{fullName}</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">{ROLE_LABELS[role]}</p>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-50 bg-brand-700 shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              getInitials(fullName)
            )}
          </div>
        </button>

        {dropdownOpen && (
          <div id={dropdownId} className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50">
            <Link
              href={`/${role}/profile`}
              onClick={() => setDropdownOpen(false)}
              className="block px-4 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors rounded-t-xl"
            >
              <p className="text-xs font-semibold text-slate-900 truncate">{fullName}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{ROLE_LABELS[role]}</p>
            </Link>

            <Link
              href={`/${role}/profile`}
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <UserCircle className="w-4 h-4 shrink-0 text-slate-400" />
              Mi Perfil
            </Link>

            <div className="border-t border-slate-100 my-0.5" />

            <LogoutButton className="px-4 py-2.5 text-sm text-red-700 hover:bg-red-50" />
          </div>
        )}
      </div>
    </header>
  );
}
