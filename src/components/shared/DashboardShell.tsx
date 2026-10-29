"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { UserRole } from "@/modules/auth/types";

interface DashboardShellProps {
  role: UserRole;
  fullName: string;
  avatarUrl?: string | null;
  userId: string;
  initialUnreadCount: number;
  children: React.ReactNode;
}

export function DashboardShell({ role, fullName, avatarUrl, userId, initialUnreadCount, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        role={role}
        fullName={fullName}
        avatarUrl={avatarUrl}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 lg:ml-0">
        <Topbar
          fullName={fullName}
          role={role}
          avatarUrl={avatarUrl}
          userId={userId}
          initialUnreadCount={initialUnreadCount}
          onMenuClick={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
