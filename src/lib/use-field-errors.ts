"use client";

import { useState, useEffect } from "react";
import type { ActionResult } from "./action-result";

export function useFieldErrors(state: ActionResult) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFieldErrors(state?.fieldErrors ?? {});
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

  return { fieldErrors, handleChange };
}
