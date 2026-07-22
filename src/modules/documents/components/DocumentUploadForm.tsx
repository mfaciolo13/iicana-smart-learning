"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { Resolver } from "react-hook-form";
import { Upload } from "lucide-react";
import { uploadDocumentAction } from "../actions";
import { uploadDocumentSchema } from "../schemas";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useFormAction } from "@/lib/use-form-action";

// name es opcional acá: si se deja vacío, el server lo completa con el nombre del archivo
const clientSchema = uploadDocumentSchema.partial();
type FormValues = z.infer<typeof clientSchema>;

export function DocumentUploadForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(clientSchema) as Resolver<FormValues>,
    defaultValues: { name: "", description: "" },
  });
  const { register, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, uploadDocumentAction);

  return (
    <form ref={formRef} onSubmit={onSubmit} encType="multipart/form-data" className="space-y-4">
      <Field label="Nombre del documento" id="name" error={errors.name?.message}>
        <Input id="name" placeholder="ej. Guía de gramática — Nivel Intermedio" {...register("name")} />
      </Field>

      <Field label="Descripción" id="description" error={errors.description?.message}>
        <Input id="description" placeholder="Descripción breve (opcional)" {...register("description")} />
      </Field>

      <Field label="Archivo" id="file">
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
          className="w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 transition-colors cursor-pointer"
        />
        <p className="text-xs text-slate-400 mt-1">PDF, Word, imágenes o texto. Máximo 10 MB.</p>
      </Field>

      <Button type="submit" loading={isPending} iconLeft={<Upload className="w-4 h-4" />}>
        Subir documento
      </Button>
    </form>
  );
}
