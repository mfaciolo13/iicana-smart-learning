export interface DocumentItem {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string;
  uploadedByName: string;
  createdAt: Date;
}
