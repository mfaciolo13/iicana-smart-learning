import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";

// Nombre de persona: empieza con letra y solo admite letras (con acentos),
// espacios, guiones, apóstrofes y puntos. No permite dígitos ni símbolos.
const PERSON_NAME_REGEX = /^\p{L}[\p{L}\p{M}\s''.-]*$/u;

// Caracteres NO permitidos en un nombre. Útil para sanitizar el input en el
// cliente en tiempo real (replace), evitando que se tipeen caracteres especiales.
export const NAME_DISALLOWED_CHARS = /[^\p{L}\p{M}\s''.-]/gu;

// Caracteres NO permitidos en un teléfono argentino — solo dígitos.
export const PHONE_DISALLOWED_CHARS = /[^\d]/g;

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

// Fecha de nacimiento: fecha válida, no futura, con una antigüedad máxima de
// 100 años y una edad mínima configurable. Devuelve mensajes específicos.
export function birthDateField(minAge = 0) {
  return z
    .string()
    .min(1, "Fecha de nacimiento requerida")
    .refine((v) => !isNaN(new Date(v).getTime()), "Ingresá una fecha válida")
    .refine((v) => new Date(v) <= new Date(), "La fecha no puede ser futura")
    .refine((v) => {
      const min = new Date();
      min.setFullYear(min.getFullYear() - 100);
      return new Date(v) >= min;
    }, "La edad máxima permitida es 100 años")
    .refine((v) => {
      if (minAge <= 0) return true;
      const max = new Date();
      max.setFullYear(max.getFullYear() - minAge);
      return new Date(v) <= max;
    }, `La edad mínima permitida es ${minAge} años`);
}

// DNI argentino: únicamente dígitos, 7 u 8.
export function dniField() {
  return z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, "El DNI debe contener solo números (7 u 8 dígitos)");
}

// Teléfono argentino: solo dígitos, sin código de país (+54).
// Validado con libphonenumber-js usando el contexto del país AR.
export function phoneField() {
  return z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^\d+$/, "Solo se permiten números, sin código de país (ej: 3516789012)")
        .refine(
          (v) => {
            try {
              return parsePhoneNumberFromString(v, "AR")?.isValid() ?? false;
            } catch {
              return false;
            }
          },
          "Ingresá un número de teléfono argentino válido (ej: 3516789012)",
        ),
    ])
    .optional()
    .transform((v) => (v === "" ? undefined : v));
}
