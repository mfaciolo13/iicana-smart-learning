"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { loginSchema, registerSchema } from "./schemas";
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

  let { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const meta = user.user_metadata ?? {};
    const { data: created } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email!,
        full_name: (meta.full_name as string) ?? "",
        role: (meta.role as string) ?? "alumno",
      })
      .select("role")
      .single();
    profile = created;
  }

  const role = profile?.role ?? "alumno";
  // "admin" → "director" mientras se aplica la migración SQL en Supabase
  const target = role === "administrativo" || role === "admin" ? "director" : role;
  redirect(`/${target}`);
}

export async function registerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    fullName: formData.get("fullName") as string,
    role: formData.get("role") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const allowedSelfRegisterRoles = ["alumno"] as const;
  type AllowedRole = (typeof allowedSelfRegisterRoles)[number];
  if (!(allowedSelfRegisterRoles as readonly string[]).includes(parsed.data.role)) {
    return { error: "Rol no permitido para el registro público." };
  }
  const safeRole: AllowedRole = parsed.data.role as AllowedRole;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        role: safeRole,
      },
    },
  });

  if (error) return { error: error.message };

  if (data.user) {
    await supabase.from("profiles").insert({
      id: data.user.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      role: safeRole,
    });
  }

  redirect("/login?registered=1");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = formData.get("email");
  const parsed = z.email("Email inválido").safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const origin = (await headers()).get("origin") ?? "https://cervantes-smart-learning.com.ar";
  const redirectTo = `${origin}/update-password`;

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
