"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import Link from "next/link";

type Stage = "loading" | "form" | "invalid" | "success";

export default function UpdatePasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);

    // PKCE flow: Supabase redirects with ?code= when the project has PKCE enabled
    const code = url.searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: exchError }) => {
        if (exchError) setStage("invalid");
        else setStage("form");
      });
      // Clean up the code from the URL so a refresh doesn't re-use it
      window.history.replaceState({}, "", url.pathname);
      return;
    }

    // Supabase error in hash (e.g. otp_expired, access_denied)
    const hash = window.location.hash.slice(1);
    const hashParams = new URLSearchParams(hash);
    if (hashParams.get("error")) {
      window.history.replaceState({}, "", url.pathname);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage("invalid");
      return;
    }

    // Implicit/hash flow: Supabase redirects with #access_token= (admin generateLink)
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") ?? "";
    const type = hashParams.get("type");

    if (accessToken && type === "recovery") {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessError }) => {
          if (sessError) setStage("invalid");
          else setStage("form");
        });
      // Clean up hash from URL
      window.history.replaceState({}, "", url.pathname);
      return;
    }

    // Fallback: listen for PASSWORD_RECOVERY event (fires on client init when hash is present)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setStage("form");
      }
    });

    // Also check for an existing valid session (e.g. user revisits the page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStage("form");
      else {
        setTimeout(() => {
          setStage((prev) => (prev === "loading" ? "invalid" : prev));
        }, 2500);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      const msg = updateError.message.toLowerCase();
      setError(
        msg.includes("different from the old password")
          ? "La nueva contraseña debe ser diferente a la actual."
          : updateError.message
      );
      setSubmitting(false);
      return;
    }

    setStage("success");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      window.location.href = `/${profile?.role ?? "alumno"}`;
    } else {
      window.location.href = "/login";
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-120">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
            >
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="10,2 18,6.5 10,11 2,6.5" fill="white"/>
                <path d="M4 8v3.5C4 14.5 7 16 10 16s6-1.5 6-4.5V8Z" fill="white" fillOpacity="0.3"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Learning</h1>
          </div>
          <p className="text-sm text-slate-500">Sistema de Gestión Académica</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8">
          {stage === "loading" && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
              <p className="text-sm text-slate-500">Verificando link...</p>
            </div>
          )}

          {stage === "invalid" && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Link inválido o expirado</h2>
              <p className="text-sm text-slate-500 mb-6">
                El link de acceso ya fue usado o expiró. Pedile al administrador que te reenvíe el acceso.
              </p>
              <Link href="/login" className="text-sm text-brand-700 hover:underline font-medium">
                Ir al login
              </Link>
            </div>
          )}

          {stage === "form" && (
            <>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Establecé tu contraseña</h2>
              <p className="text-sm text-slate-500 mb-6">
                Elegí una contraseña para acceder a la plataforma.
              </p>

              {error && (
                <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <Field label="Nueva contraseña" required id="password">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    autoFocus
                    disabled={submitting}
                  />
                </Field>

                <Field label="Confirmá la contraseña" required id="confirmPassword">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Repetí tu contraseña"
                    disabled={submitting}
                  />
                </Field>

                <Button type="submit" fullWidth size="lg" loading={submitting} className="mt-2">
                  {submitting ? "Guardando..." : "Guardar contraseña"}
                </Button>
              </form>
            </>
          )}

          {stage === "success" && (
            <div className="flex flex-col items-center py-4 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">¡Contraseña guardada!</h2>
              <p className="text-sm text-slate-500">Redirigiendo a tu portal...</p>
              <div className="w-5 h-5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin mt-1" />
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © Smart Learning {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
