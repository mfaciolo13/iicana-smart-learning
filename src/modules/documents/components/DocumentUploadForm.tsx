"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { uploadDocumentAction } from "../actions";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/action-result";

export function DocumentUploadForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(uploadDocumentAction, undefined);

  useEffect(() => {
    if (state?.error && !state?.fieldErrors) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action} encType="multipart/form-data" className="space-y-4">
      <Field label="Nombre del documento" id="name" error={state?.fieldErrors?.name}>
        <Input id="name" name="name" placeholder="ej. Guía de gramática — Nivel Intermedio" />
      </Field>

      <Field label="Descripción" id="description" error={state?.fieldErrors?.description}>
        <Input id="description" name="description" placeholder="Descripción breve (opcional)" />
      </Field>

      <Field label="Archivo" id="file" error={state?.error && state.error.includes("archivo") ? state.error : undefined}>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
          className="w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 transition-colors cursor-pointer"
        />
        <p className="text-xs text-slate-400 mt-1">PDF, Word, imágenes o texto. Máximo 10 MB.</p>
      </Field>

      {state?.error && !state?.fieldErrors && (
        <p className="text-sm text-danger-500">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} iconLeft={<Upload className="w-4 h-4" />}>
        {pending ? "Subiendo..." : "Subir documento"}
      </Button>
    </form>
  );
}
