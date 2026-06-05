import { getDocuments } from "@/modules/documents/services/documents.service";
import { DocumentList } from "@/modules/documents/components/DocumentList";

export default async function DocumentsPage() {
  const docs = await getDocuments();
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Material institucional</h2>
        <p className="text-sm text-slate-400 mt-0.5">Documentos y material de estudio del instituto</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <DocumentList documents={docs} canDelete={false} />
      </div>
    </div>
  );
}
