import { getDocuments } from "@/modules/documents/services/documents.service";
import { DocumentList } from "@/modules/documents/components/DocumentList";
import { DocumentUploadForm } from "@/modules/documents/components/DocumentUploadForm";
import { Card } from "@/components/ui/Card";

export default async function DocumentsPage() {
  const docs = await getDocuments();
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Material institucional</h2>
        <p className="text-sm text-slate-400 mt-0.5">{docs.length} documento{docs.length !== 1 ? "s" : ""} disponible{docs.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
          <DocumentList documents={docs} canDelete />
        </div>
        <div>
          <Card title="Subir documento" padding="md">
            <DocumentUploadForm />
          </Card>
        </div>
      </div>
    </div>
  );
}
