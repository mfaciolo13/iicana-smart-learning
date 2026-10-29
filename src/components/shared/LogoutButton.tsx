"use client";

import { useFormStatus } from "react-dom";
import { Loader2, LogOut } from "lucide-react";
import { logoutAction } from "@/modules/auth/actions";
import { cn } from "@/lib/cn";

/**
 * Botón "Cerrar sesión" del sidebar y del menú del topbar. Mientras el action corre muestra
 * spinner, cambia el texto y se deshabilita: antes el click no daba ninguna señal hasta el redirect.
 */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <Submit className={className} />
    </form>
  );
}

function Submit({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "w-full flex items-center gap-2.5 transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-70",
        className
      )}
    >
      {pending ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <LogOut className="w-4 h-4 shrink-0" />}
      {pending ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
