"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "./action-result";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const ACTION_TIMEOUT_MS = 20_000;

export function useFormAction<T extends FieldValues>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<T, any, any>,
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>,
  options?: { /** Limpia el formulario tras un éxito sin redirección. */ resetOnSuccess?: boolean },
) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  // eslint-disable-next-line react-hooks/refs
  const onSubmit = form.handleSubmit(() => {
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof action>>;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        // Timeout de 20 s: una mutación que no responde no debe dejar el botón girando sin aviso.
        result = await Promise.race([
          action(undefined, new FormData(formRef.current!)),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error("timeout")), ACTION_TIMEOUT_MS);
          }),
        ]);
      } catch (e) {
        if (isRedirectError(e)) throw e;
        // Una excepción del servidor no debe tumbar la página ni perder lo escrito.
        toast.error(
          e instanceof Error && e.message === "timeout"
            ? "No pudimos guardar, reintentá."
            : "No se pudo completar la acción. Revisá los datos e intentá de nuevo."
        );
        return;
      } finally {
        clearTimeout(timeout);
      }
      if (result?.error) toast.error(result.error);
      if (result?.fieldErrors) {
        const entries = Object.entries(result.fieldErrors);
        for (const [field, message] of entries) {
          form.setError(field as Path<T>, { message });
        }
        if (entries.length > 0) {
          formRef.current
            ?.querySelector<HTMLElement>(`[name="${entries[0][0]}"]`)
            ?.focus();
        }
      }
      if (result?.success) {
        toast.success(result.success);
        if (options?.resetOnSuccess && !result.redirectTo) {
          form.reset();
          formRef.current?.reset();
        }
        if (result.redirectTo) router.push(result.redirectTo);
      }
    });
  });

  return { formRef, onSubmit, isPending };
}
