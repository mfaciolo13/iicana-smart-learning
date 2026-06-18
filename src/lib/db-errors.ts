// Helpers para identificar errores de PostgreSQL y convertirlos en mensajes
// amigables, evitando que una excepción de la DB se propague como un error 500.

// Detecta una violación de restricción única (unique_violation = código 23505).
// Funciona tanto con errores de postgres-js (Drizzle) como de PostgREST (Supabase),
// que exponen el código en la propiedad `code`.
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}
