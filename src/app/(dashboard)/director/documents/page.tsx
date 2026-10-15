import { getDocuments } from "@/modules/documents/services/documents.service";
import { DocumentsListPage } from "@/modules/documents/components/DocumentsListPage";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <DocumentsListPage sp={await searchParams} basePath="/director/documents" docs={await getDocuments()} canDelete canUpload />;
}
