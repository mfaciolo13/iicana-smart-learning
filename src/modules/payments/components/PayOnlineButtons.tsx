"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CreditCard, Landmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCents } from "@/lib/money";
import { startOnlinePaymentAction } from "../online-actions";

interface PayOnlineButtonsProps {
  paymentId: string;
  /** Importes ya calculados por el servidor; acá solo se muestran. */
  transferCents: number;
  cardCents: number;
  /** Medio de una operación en curso: se ofrece continuarla en vez de iniciar otra. */
  activeMethod?: "transfer" | "card";
}

/** Botones "Pagar con Mercado Pago". El servidor valida la cuota, calcula el importe y devuelve la URL. */
export function PayOnlineButtons({ paymentId, transferCents, cardCents, activeMethod }: PayOnlineButtonsProps) {
  const [pending, startTransition] = useTransition();

  function pay(method: "transfer" | "card") {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("paymentId", paymentId);
      fd.set("method", method);
      try {
        const result = await startOnlinePaymentAction(undefined, fd);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        if (result?.redirectTo) window.location.assign(result.redirectTo);
      } catch {
        toast.error("No se pudo iniciar el pago. Intentá de nuevo.");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <Button type="button" variant={activeMethod === "transfer" ? "primary" : "secondary"} loading={pending} onClick={() => pay("transfer")}>
        <Landmark className="w-4 h-4" />
        {activeMethod === "transfer" ? "Continuar transferencia" : `Pagar por transferencia · ${formatCents(transferCents)}`}
      </Button>
      <Button type="button" variant={activeMethod === "card" ? "primary" : "secondary"} loading={pending} onClick={() => pay("card")}>
        <CreditCard className="w-4 h-4" />
        {activeMethod === "card" ? "Continuar con tarjeta" : `Pagar con tarjeta · ${formatCents(cardCents)}`}
      </Button>
    </div>
  );
}
