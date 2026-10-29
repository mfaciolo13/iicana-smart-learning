import { cn } from "@/lib/cn";

/**
 * Isotipo de Smart Learning: libro abierto con señalador ocre sobre fondo tinta.
 * Es el mismo dibujo que app/icon.svg (favicon); si se cambia uno, cambiar el otro.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="#2d5383" />
      <path d="M7.5 10.5c2.8-1.3 5.6-1.3 8 0v12.5c-2.4-1.3-5.2-1.3-8 0z" fill="#ffffff" />
      <path d="M24.5 10.5c-2.8-1.3-5.6-1.3-8 0v12.5c2.4-1.3 5.2-1.3 8 0z" fill="#ffffff" fillOpacity="0.7" />
      <path d="M19.5 7.5h3.5v7.5l-1.75-1.4-1.75 1.4z" fill="#bb4141" />
    </svg>
  );
}

/** Wordmark en serif: "Smart" en romana, "Learning" en itálica. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-semibold tracking-tight leading-none whitespace-nowrap", className)}>
      Smart <em className="font-medium">Learning</em>
    </span>
  );
}

/** Isotipo + wordmark, para sidebar, páginas de auth y páginas de error. */
export function Logo({
  size = 32,
  className,
  textClassName,
}: {
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <Wordmark className={cn("text-base text-slate-900", textClassName)} />
    </span>
  );
}
