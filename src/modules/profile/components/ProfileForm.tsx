"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Camera } from "lucide-react";
import { updateProfileAction } from "../actions";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

interface ProfileFormProps {
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

export function ProfileForm({ fullName, email, phone, avatarUrl }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, undefined);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-6">
      {/* Avatar picker */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative group">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-24 h-24 rounded-full overflow-hidden focus:outline-none"
            aria-label="Cambiar foto de perfil"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
              >
                {getInitials(fullName)}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </button>
        </div>
        <p className="text-xs text-slate-400">Tocá la imagen para cambiarla · JPG, PNG o WebP · máx. 2 MB</p>
        <input
          ref={fileRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Field label="Nombre completo" required id="fullName">
        <Input
          id="fullName"
          name="fullName"
          required
          defaultValue={fullName}
          placeholder="Nombre y apellido"
        />
      </Field>

      <Field label="Email" id="email" helper="El email no se puede cambiar desde aquí.">
        <Input id="email" type="email" defaultValue={email} disabled />
      </Field>

      <Field label="Teléfono" id="phone">
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          placeholder="Ej: +54 9 351 123 4567"
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
