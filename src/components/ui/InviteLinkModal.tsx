"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface InviteLinkModalProps {
  link: string;
  onContinue: () => void;
}

export function InviteLinkModal({ link, onContinue }: InviteLinkModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Link de acceso generado</h2>
            <p className="text-xs text-slate-500">Compartilo con el usuario para que establezca su contraseña.</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-slate-500 mb-1 font-medium">Link de invitación</p>
          <p className="text-xs text-slate-700 break-all leading-relaxed">{link}</p>
        </div>

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
          Este link es de uso único y expira en 24 horas. Una vez usado, no puede reutilizarse.
        </p>

        <div className="flex gap-3">
          <Button variant="primary" fullWidth onClick={handleCopy}>
            {copied ? "¡Copiado!" : "Copiar link"}
          </Button>
          <Button variant="secondary" fullWidth onClick={onContinue}>
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
