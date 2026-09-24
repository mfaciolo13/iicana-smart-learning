import { z } from "zod";

export const loginSchema = z.object({
  // Mensajes específicos para campos vacíos: antes un email vacío decía "Email inválido" (SCRUM-330).
  email: z.string().trim().min(1, "Ingresá tu email").pipe(z.email("Email inválido")),
  password: z.string().min(1, "Ingresá tu contraseña").min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
