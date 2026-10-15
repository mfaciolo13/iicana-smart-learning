"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface SearchInputProps {
  placeholder: string;
  /** Cantidad de resultados de la búsqueda actual, para mostrar "N resultados para «q»". */
  resultCount?: number;
  className?: string;
}

/**
 * Buscador de listados (SCRUM-273). Filtra mientras se escribe (debounce de 300 ms) y también
 * con el botón o Enter; la URL refleja `?q=` y conserva el resto de los parámetros (ej: rol).
 * Antes era un form GET que sólo filtraba con Enter: el usuario creía haber filtrado y
 * operaba sobre otra fila.
 */
export function SearchInput({ placeholder, resultCount, className }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const applied = params.get("q") ?? "";
  const [value, setValue] = useState(applied);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function apply(next: string) {
    const nextParams = new URLSearchParams(params.toString());
    const trimmed = next.trim();
    if (trimmed) nextParams.set("q", trimmed);
    else nextParams.delete("q");
    // Una búsqueda nueva vuelve a la primera página.
    nextParams.delete("page");
    const qs = nextParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function onChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(next), 300);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  // Si la búsqueda cambia desde afuera (por ejemplo, al quitar su chip de filtro), el campo la sigue.
  // Se ajusta durante el render, que es el patrón recomendado en lugar de un efecto.
  const [lastApplied, setLastApplied] = useState(applied);
  if (applied !== lastApplied) {
    setLastApplied(applied);
    setValue(applied);
  }

  return (
    <div className={className}>
      <form
        role="search"
        className="flex gap-2 w-full sm:max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          clearTimeout(timer.current);
          apply(value);
        }}
      >
        <Input
          name="q"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full"
        />
        <Button type="submit" variant="secondary" iconLeft={<Search className="w-4 h-4" />}>
          Buscar
        </Button>
      </form>
      {applied && resultCount !== undefined && (
        <p className="mt-2 text-xs text-slate-500" role="status">
          {resultCount === 0
            ? `Sin resultados para «${applied}»`
            : `${resultCount} resultado${resultCount !== 1 ? "s" : ""} para «${applied}»`}
        </p>
      )}
    </div>
  );
}
