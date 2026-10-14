import { z } from "zod";

export const uploadDocumentSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(150, "El nombre no puede superar los 150 caracteres"),
  description: z.string().max(500, "La descripción no puede superar los 500 caracteres").optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
