import { z } from "zod";

// Validadores reutilizables para campos que deben coincidir con el formato
// esperado por la DB y las reglas de negocio. Centralizados acá para que todos
// los formularios apliquen las mismas reglas.

// Nombre de persona: empieza con letra y solo admite letras (con acentos),
// espacios, guiones, apóstrofes y puntos. No permite dígitos ni símbolos.
const PERSON_NAME_REGEX = /^\p{L}[\p{L}\p{M}\s'’.-]*$/u;

// Caracteres NO permitidos en un nombre. Útil para sanitizar el input en el
// cliente en tiempo real (replace), evitando que se tipeen caracteres especiales.
export const NAME_DISALLOWED_CHARS = /[^\p{L}\p{M}\s'’.-]/gu;

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

// Fecha de nacimiento: fecha válida, no futura y con una antigüedad máxima de
// 100 años. Devuelve mensajes específicos según el caso.
export function birthDateField() {
  return z
    .string()
    .min(1, "Fecha de nacimiento requerida")
    .refine((v) => !isNaN(new Date(v).getTime()), "Ingresá una fecha válida")
    .refine((v) => new Date(v) <= new Date(), "La fecha no puede ser futura")
    .refine((v) => {
      const min = new Date();
      min.setFullYear(min.getFullYear() - 100);
      return new Date(v) >= min;
    }, "La edad máxima permitida es 100 años");
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
