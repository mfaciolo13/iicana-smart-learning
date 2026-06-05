import { z } from "zod";

export const uploadDocumentSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
