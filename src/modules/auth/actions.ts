"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loginSchema, registerSchema } from "./schemas";

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

  // Profile missing — auto-create from auth metadata
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

  // redirect() throws internally — Next.js includes Set-Cookie headers from
  // the supabase session in the redirect response, so cookies are committed
  // before the browser navigates.
  redirect(`/${profile?.role ?? "alumno"}`);
}

export async function registerAction(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    fullName: formData.get("fullName") as string,
    role: formData.get("role") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Self-registration is only allowed for non-privileged roles.
  // Admins create other admins/teachers via the Users panel.
  const allowedSelfRegisterRoles = ["alumno", "tutor"] as const;
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

  if (error) {
    return { error: error.message };
  }

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
