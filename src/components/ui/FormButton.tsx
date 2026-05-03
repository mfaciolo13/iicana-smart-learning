"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/Button";
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

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={formAction} className="contents">
      {Object.entries(fields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button
        type="submit"
        variant={variant}
        size={size}
        loading={isPending}
        className={cn(className)}
        onClick={
          confirmMessage
            ? (e) => {
                if (!confirm(confirmMessage)) e.preventDefault();
              }
            : undefined
        }
      >
        {children}
      </Button>
    </form>
  );
}
