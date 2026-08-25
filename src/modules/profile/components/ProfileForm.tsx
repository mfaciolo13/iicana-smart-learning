"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { updateProfileAction } from "../actions";
import { personNameField, phoneField, NAME_DISALLOWED_CHARS, PHONE_DISALLOWED_CHARS } from "@/lib/validation";
import { useFormAction } from "@/lib/use-form-action";
import type { Resolver } from "react-hook-form";

function sanitizeNameInput(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const cleaned = el.value.replace(NAME_DISALLOWED_CHARS, "");
  if (cleaned !== el.value) el.value = cleaned;
}

function sanitizePhoneInput(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const cleaned = el.value.replace(PHONE_DISALLOWED_CHARS, "");
  if (cleaned !== el.value) el.value = cleaned;
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const profileSchema = z.object({
  fullName: personNameField("El nombre"),
  phone: phoneField(),
});
type FormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

export function ProfileForm({ fullName, email, phone, avatarUrl }: ProfileFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(profileSchema) as Resolver<FormValues>,
    defaultValues: { fullName, phone: phone ?? "" },
  });
  const { register, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, updateProfileAction);

  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setPreview(previewUrl);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} encType="multipart/form-data" className="space-y-6">
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
                style={{ background: "linear-gradient(135deg, #3a669a, #2d5383)" }}
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
        <input ref={fileRef} type="file" name="avatar" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      </div>

      <Field label="Nombre completo" required id="fullName" error={errors.fullName?.message}>
        <Input id="fullName" onInput={sanitizeNameInput} placeholder="Nombre y apellido" {...register("fullName")} />
      </Field>

      <Field label="Email" id="email" helper="El email no se puede cambiar desde aquí.">
        <Input id="email" type="text" defaultValue={email} disabled />
      </Field>

      <Field label="Teléfono" id="phone" error={errors.phone?.message}>
        <Input id="phone" type="tel" inputMode="numeric" onInput={sanitizePhoneInput} maxLength={11} placeholder="Ej: 3516789012" {...register("phone")} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
