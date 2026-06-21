"use client";

import { useState, useEffect, useRef } from "react";
import type { ActionResult } from "./action-result";

export function useFieldErrors(state: ActionResult) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const errors = state?.fieldErrors ?? {};
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFieldErrors(errors);

    const names = Object.keys(errors);
    if (names.length > 0 && formRef.current) {
      const selector = names.map((n) => `[name="${n}"]`).join(", ");
      const first = formRef.current.querySelector<HTMLElement>(selector);
      first?.focus();
    }
  }, [state]);

  function handleChange(e: React.FormEvent<HTMLFormElement>) {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const { name } = target;
    if (!name) return;
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  return { fieldErrors, handleChange, formRef };
}
