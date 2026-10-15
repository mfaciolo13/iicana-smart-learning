import { DocumentList } from "./DocumentList";
import { DocumentUploadForm } from "./DocumentUploadForm";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { inDateRange, parseFilters, type FilterField } from "@/lib/filters";
import type { DocumentItem } from "../types";

type SearchParams = Record<string, string | undefined>;

const KIND_LABELS: Record<string, string> = { pdf: "PDF", word: "Word", imagen: "Imagen", texto: "Texto", otro: "Otro" };

/** Tipo de archivo legible a partir del mimeType. */
function kindOf(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("word") || mime.includes("officedocument.wordprocessingml")) return "word";
  if (mime.startsWith("image/")) return "imagen";
  if (mime.startsWith("text/")) return "texto";
  return "otro";
}

function instituteDay(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
}

interface DocumentsListPageProps {
  sp: SearchParams;
  basePath: string;
  docs: DocumentItem[];
  /** Muestra el botón de eliminar en cada fila (sólo Dirección). */
  canDelete?: boolean;
  /** Muestra el panel "Subir documento" (Dirección y docentes). */
  canUpload?: boolean;
  subtitle?: string;
}

/** Material institucional con búsqueda, filtros, orden y paginación (todos los roles). */
export function DocumentsListPage({ sp, basePath, docs, canDelete = false, canUpload = false, subtitle }: DocumentsListPageProps) {
  const { q } = sp;
  const query = parseTableQuery(sp, { sortable: ["name", "size", "uploader", "date"], defaultSort: "date", defaultDir: "desc" });

  const uploaders = [...new Set(docs.map((d) => d.uploadedByName))].sort((a, b) => a.localeCompare(b, "es"));
  const kinds = [...new Set(docs.map((d) => kindOf(d.mimeType)))];
  const fields: FilterField[] = [
    { key: "tipo", label: "Tipo de archivo", type: "select", options: kinds.map((k) => ({ value: k, label: KIND_LABELS[k] })) },
    { key: "subidopor", label: "Subido por", type: "select", options: uploaders.map((u) => ({ value: u, label: u })) },
    { key: "desde", label: "Desde", type: "date" },
    { key: "hasta", label: "Hasta", type: "date" },
  ];
  const filters = parseFilters(sp, fields);

  let list = docs;
  if (q) list = list.filter((d) => matchesSearch(d.name, q) || matchesSearch(d.description ?? "", q));
  if (filters.tipo) list = list.filter((d) => kindOf(d.mimeType) === filters.tipo);
  if (filters.subidopor) list = list.filter((d) => d.uploadedByName === filters.subidopor);
  if (filters.desde || filters.hasta) list = list.filter((d) => inDateRange(instituteDay(d.createdAt), filters.desde, filters.hasta));

  const sorted = sortRows(list, query, {
    name: (d) => d.name,
    size: (d) => d.fileSize,
    uploader: (d) => d.uploadedByName,
    date: (d) => new Date(d.createdAt).getTime(),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;

  const table = (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
      {hasFilters && list.length === 0 ? (
        <FilteredEmpty clearHref={basePath} noun="documento" />
      ) : (
        <>
          <DocumentList documents={page.rows} canDelete={canDelete} sort={{ basePath, searchParams: sp, query }} />
          <Pagination basePath={basePath} searchParams={sp} page={page} noun="documentos" nounSingular="documento" />
        </>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Material institucional</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {subtitle ?? `${docs.length} documento${docs.length !== 1 ? "s" : ""} disponible${docs.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {docs.length > 0 && (
        <>
          <SearchInput placeholder="Buscar por nombre o descripción..." resultCount={list.length} className="mb-3" />
          <FilterBar fields={fields} className="mb-4" />
        </>
      )}

      {canUpload ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{table}</div>
          <div>
            <Card title="Subir documento" padding="md">
              <DocumentUploadForm />
            </Card>
          </div>
        </div>
      ) : (
        table
      )}
    </div>
  );
}
