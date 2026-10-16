import { describe, it, expect } from "vitest";
import { z } from "zod";
import { uploadDocumentSchema } from "@/modules/documents/schemas";

/**
 * SCRUM-359 — subir un documento sin escribir el nombre quedaba bloqueado.
 *
 * El servidor completa el nombre con el del archivo si viene vacío, pero el
 * schema del cliente era `uploadDocumentSchema.partial()`, y `.optional()` no
 * convierte "" en undefined: la cadena vacía sigue siendo un string y choca
 * contra el `.min(2)`. El submit se bloqueaba con "El nombre debe tener al
 * menos 2 caracteres" en un campo que no está marcado como requerido.
 */

// Mismo schema que arma DocumentUploadForm.
const clientSchema = uploadDocumentSchema.partial().extend({
  name: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    uploadDocumentSchema.shape.name.optional(),
  ),
});

describe("schema del formulario de subida", () => {
  it("acepta el nombre vacio: el server lo completa con el del archivo", () => {
    const result = clientSchema.safeParse({ name: "", description: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBeUndefined();
  });

  it("acepta que el nombre no venga", () => {
    const result = clientSchema.safeParse({ description: "" });
    expect(result.success).toBe(true);
  });

  it("acepta un nombre valido", () => {
    const result = clientSchema.safeParse({ name: "Guia de gramatica", description: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Guia de gramatica");
  });

  it("sigue rechazando un nombre de una sola letra", () => {
    expect(clientSchema.safeParse({ name: "a" }).success).toBe(false);
  });

  it("sigue rechazando un nombre de mas de 150 caracteres", () => {
    expect(clientSchema.safeParse({ name: "a".repeat(151) }).success).toBe(false);
  });
});

describe("schema del servidor", () => {
  it("sigue exigiendo el nombre: ahi ya viene resuelto con el del archivo", () => {
    expect(uploadDocumentSchema.safeParse({ description: "" }).success).toBe(false);
    expect(uploadDocumentSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("acepta el nombre derivado del archivo", () => {
    // Lo que arma la action: file.name sin la extension.
    const derivado = "apunte-clase-3.pdf".replace(/\.[^.]+$/, "");
    expect(uploadDocumentSchema.safeParse({ name: derivado }).success).toBe(true);
  });
});
