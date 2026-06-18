import { z } from "zod";

// Validadores reutilizables para campos que deben coincidir con el formato
// esperado por la DB y las reglas de negocio. Centralizados acá para que todos
// los formularios apliquen las mismas reglas.

// Nombre de persona: empieza con letra y solo admite letras (con acentos),
// espacios, guiones, apóstrofes y puntos. No permite dígitos ni símbolos.
const PERSON_NAME_REGEX = /^\p{L}[\p{L}\p{M}\s'’.-]*$/u;

export function personNameField(label = "El nombre") {
  return z
    .string()
    .trim()
    .min(2, `${label} debe tener al menos 2 caracteres`)
    .max(100, `${label} es demasiado largo`)
    .regex(
      PERSON_NAME_REGEX,
      `${label} solo puede contener letras, espacios, guiones y apóstrofes`,
    );
}

// DNI argentino: únicamente dígitos, 7 u 8.
export function dniField() {
  return z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, "El DNI debe contener solo números (7 u 8 dígitos)");
}

// Teléfono opcional: dígitos, espacios, +, guiones y paréntesis.
const PHONE_REGEX = /^[\d\s+()-]{6,20}$/;

export function phoneField() {
  return z
    .union([
      z.literal(""),
      z.string().trim().regex(PHONE_REGEX, "Teléfono inválido (solo números, +, espacios y guiones)"),
    ])
    .optional()
    .transform((v) => (v === "" ? undefined : v));
}
