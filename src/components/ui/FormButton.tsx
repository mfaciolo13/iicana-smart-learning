"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/action-result";
import type { VariantProps } from "class-variance-authority";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

interface FormButtonProps {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  fields?: Record<string, string>;
  children: React.ReactNode;
  variant?: ButtonVariantProps["variant"];
  size?: ButtonVariantProps["size"];
  confirmMessage?: string;
  className?: string;
}

export function FormButton({
  action,
  fields,
  children,
  variant = "primary",
  size = "md",
  confirmMessage,
  className,
}: FormButtonProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (confirmMessage) {
      e.preventDefault();
      setShowConfirm(true);
    }
  }

  function handleConfirm() {
    setShowConfirm(false);
    if (formRef.current) {
      formAction(new FormData(formRef.current));
    }
  }

  return (
    <>
      <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="contents">
        {Object.entries(fields ?? {}).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button
          type="submit"
          variant={variant}
          size={size}
          loading={isPending}
          className={cn(className)}
        >
          {children}
        </Button>
      </form>

      {confirmMessage && (
        <ConfirmDialog
          open={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
          message={confirmMessage}
          variant={variant === "danger" ? "danger" : "primary"}
        />
      )}
    </>
  );
}
