"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "./action-result";

export function useFormAction<T extends FieldValues>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<T, any, any>,
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>,
) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  // eslint-disable-next-line react-hooks/refs
  const onSubmit = form.handleSubmit(() => {
    startTransition(async () => {
      const result = await action(undefined, new FormData(formRef.current!));
      if (result?.error) toast.error(result.error);
      if (result?.fieldErrors) {
        const entries = Object.entries(result.fieldErrors);
        for (const [field, message] of entries) {
          form.setError(field as Path<T>, { message });
        }
        if (entries.length > 0) {
          formRef.current
            ?.querySelector<HTMLElement>(`[name="${entries[0][0]}"]`)
            ?.focus();
        }
      }
      if (result?.success) {
        toast.success(result.success);
        if (result.redirectTo) router.push(result.redirectTo);
      }
    });
  });

  return { formRef, onSubmit, isPending };
}
