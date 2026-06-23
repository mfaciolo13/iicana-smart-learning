"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import Link from "next/link";
import type { z } from "zod";
import { FileText, FileImage, File, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { generateAssessmentSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";

type FormValues = z.infer<typeof generateAssessmentSchema>;

interface Course { id: string; name: string; level: string }
interface DocumentOption { id: string; name: string; mimeType: string }

interface GenerateAssessmentFormProps {
  courses: Course[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  cancelHref?: string;
  documents?: DocumentOption[];
}

const AI_SUPPORTED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

function DocumentIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf" || mimeType.includes("word")) return <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />;
  if (mimeType.startsWith("image/")) return <FileImage className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  return <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

export function GenerateAssessmentForm({ courses, action, cancelHref = "/director/assessments", documents = [] }: GenerateAssessmentFormProps) {
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(generateAssessmentSchema),
    defaultValues: { courseId: "", weekLabel: "", topic: "" },
  });
  const { register, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  function toggleDoc(id: string) {
    setSelectedDocIds((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5 mt-2">
      <input type="hidden" name="documentIds" value={selectedDocIds.join(",")} />

      <Field label="Curso" required id="courseId" error={errors.courseId?.message}>
        <Select id="courseId" {...register("courseId")} defaultValue="">
          <option value="" disabled>Seleccioná un curso...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.level}</option>
          ))}
        </Select>
      </Field>

      <Field label="Semana" required id="weekLabel" helper="Ej: Semana 3 — Mayo 2026" error={errors.weekLabel?.message}>
        <Input id="weekLabel" placeholder="Semana 3 — Mayo 2026" {...register("weekLabel")} />
      </Field>

      <Field label="Tema de la semana" required id="topic" helper="Describí el contenido dado: gramática, vocabulario, función comunicativa, etc." error={errors.topic?.message}>
        <Textarea id="topic" rows={3} placeholder="Ej: Present Perfect — usos con 'already', 'yet' y 'just'. Vocabulario de viajes." {...register("topic")} />
      </Field>

      {documents.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
            Material de referencia <span className="font-normal text-slate-400 normal-case">(opcional)</span>
          </p>
          <p className="text-xs text-slate-400 mb-2">Seleccioná documentos para que Claude los use como contexto al generar las preguntas.</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {documents.map((doc) => {
              const supported = AI_SUPPORTED_MIME_TYPES.has(doc.mimeType);
              const selected = selectedDocIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  type="button"
                  disabled={!supported}
                  onClick={() => toggleDoc(doc.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                    !supported ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                      : selected ? "border-brand-700 bg-brand-50 text-brand-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <DocumentIcon mimeType={doc.mimeType} />
                  <span className="flex-1 truncate">{doc.name}</span>
                  {!supported && <span className="text-[10px] text-slate-400 shrink-0">No compatible con IA</span>}
                  {selected && <X className="w-3 h-3 text-brand-600 shrink-0" />}
                </button>
              );
            })}
          </div>
          {selectedDocIds.length > 0 && (
            <p className="text-xs text-brand-700 mt-1.5">
              {selectedDocIds.length} documento{selectedDocIds.length !== 1 ? "s" : ""} seleccionado{selectedDocIds.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      <div className="pt-1 flex flex-col sm:flex-row gap-3">
        <Button type="submit" variant="primary" loading={isPending} className="w-full sm:w-auto">
          ✨ Generar con IA
        </Button>
        <Link href={cancelHref} className="text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
