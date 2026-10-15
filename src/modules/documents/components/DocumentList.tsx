"use client";

import Link from "next/link";
import { Download, Trash2, FileText, FileImage, File } from "lucide-react";
import { FormButton } from "@/components/ui/FormButton";
import { deleteDocumentAction } from "../actions";
import type { DocumentItem } from "../types";
import { Th, type SortContext } from "@/components/ui/TableControls";

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf" || mimeType.includes("word")) {
    return <FileText className="w-4 h-4 text-red-500" />;
  }
  if (mimeType.startsWith("image/")) {
    return <FileImage className="w-4 h-4 text-blue-500" />;
  }
  return <File className="w-4 h-4 text-slate-400" />;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentListProps {
  documents: DocumentItem[];
  canDelete?: boolean;
  /** Si se pasa, los encabezados ordenan el listado (?sort=&dir=). */
  sort?: SortContext;
}

export function DocumentList({ documents, canDelete = false, sort }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">No hay documentos disponibles</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <Th label="Nombre" field="name" sort={sort} />
            <th className="text-left py-3 pr-4 font-medium text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Descripción</th>
            <Th label="Tamaño" field="size" sort={sort} className="hidden sm:table-cell" />
            <Th label="Subido por" field="uploader" sort={sort} className="hidden lg:table-cell" />
            <Th label="Fecha" field="date" sort={sort} className="hidden lg:table-cell" />
            <th className="py-3 text-right font-medium text-slate-500 text-xs uppercase tracking-wide">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <FileIcon mimeType={doc.mimeType} />
                  <span className="font-medium text-slate-800 truncate max-w-[180px]">{doc.name}</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-slate-500 hidden md:table-cell">
                <span className="truncate max-w-[200px] block">{doc.description ?? "—"}</span>
              </td>
              <td className="py-3 pr-4 text-slate-500 hidden sm:table-cell">{formatSize(doc.fileSize)}</td>
              <td className="py-3 pr-4 text-slate-500 hidden lg:table-cell">{doc.uploadedByName}</td>
              <td className="py-3 pr-4 text-slate-500 hidden lg:table-cell">
                {new Date(doc.createdAt).toLocaleDateString("es-AR")}
              </td>
              <td className="py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </Link>
                  {canDelete && (
                    <FormButton
                      action={deleteDocumentAction}
                      fields={{ id: doc.id }}
                      variant="danger"
                      size="sm"
                      confirmMessage={`¿Eliminar "${doc.name}"? Esta acción no se puede deshacer.`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </FormButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
