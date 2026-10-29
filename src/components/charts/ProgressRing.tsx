import { COLORS } from "./palette";

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  label: string;
  /** Texto grande del centro; por defecto el porcentaje. */
  centerText?: string;
  color?: string;
  size?: number;
}

/** Anillo de progreso en SVG puro (sin JavaScript en el cliente). */
export function ProgressRing({ value, label, centerText, color, size = 120 }: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={`${label}: ${Math.round(pct)}%`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e1e5ea" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color ?? COLORS.brand}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-900">
          {centerText ?? `${Math.round(pct)}%`}
        </div>
      </div>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
