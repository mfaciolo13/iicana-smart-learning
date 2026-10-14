"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

// SCRUM-287: un error inesperado (permisos, base de datos) no debe mostrar la pantalla genérica
// en inglés de Next.js sino un mensaje claro con la opción de reintentar.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-amber-600" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">Algo salió mal</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        No pudimos cargar esta pantalla. Probá de nuevo; si el problema sigue, avisá a la dirección del instituto.
      </p>
      {error.digest && <p className="text-xs text-slate-400 mt-2">Código: {error.digest}</p>}
      <Button className="mt-5" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
