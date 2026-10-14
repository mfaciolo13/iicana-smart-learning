"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { z } from "zod";
import { loginSchema } from "./schemas";
import { sendPasswordResetEmail } from "@/lib/email";
import type { ActionResult } from "@/lib/action-result";

export async function loginAction(_prev: unknown, formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { needsConfirmation: true };
    }
    return { error: "Credenciales inválidas. Verificá tu email y contraseña." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No se pudo obtener la sesión." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // El perfil (y su rol) solo lo crea el servidor al dar de alta al usuario. Nunca se arma
  // a partir de `user_metadata`, que controla el propio usuario (SCRUM-268 / DEV-002).
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Tu cuenta no está habilitada. Contactá a la institución." };
  }

  const role = profile.role;
  redirect(`/${role}`);
}

export async function logoutAction() {
  const supabase = await createClient();
  // scope "local": cierra sólo esta sesión, no las de otros dispositivos del usuario (SCRUM-274).
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = formData.get("email");
  const parsed = z.email("Email inválido").safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const redirectTo = `${await getSiteUrl()}/update-password`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: parsed.data,
      options: { redirectTo },
    });

    if (error || !data?.properties?.action_link) {
      // No revelar si el email existe o no — siempre mostrar éxito
      return { success: "ok" };
    }

    await sendPasswordResetEmail({ to: parsed.data, resetLink: data.properties.action_link });
  } catch {
    // Silenciar errores para no revelar si el email existe
  }

  return { success: "ok" };
}
