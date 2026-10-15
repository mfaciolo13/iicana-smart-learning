import { getDocuments } from "@/modules/documents/services/documents.service";
import { DocumentsListPage } from "@/modules/documents/components/DocumentsListPage";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <DocumentsListPage
      sp={await searchParams}
      basePath="/alumno/documents"
      docs={await getDocuments()}
      subtitle="Documentos y material de estudio del instituto"
    />
  );
}
