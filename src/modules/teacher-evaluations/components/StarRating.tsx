"use client";

import { useState } from "react";

interface StarRatingProps {
  name: string;
  label: string;
  defaultValue?: number;
}

export function StarRating({ name, label, defaultValue = 0 }: StarRatingProps) {
  const [value, setValue] = useState(defaultValue);
  const [hovered, setHovered] = useState(0);

  const active = hovered || value;

  return (
    <div>
      <p className="text-sm text-slate-700 mb-2">{label}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setValue(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className={`text-2xl transition-colors ${
              star <= active ? "text-amber-400" : "text-slate-200"
            } hover:text-amber-400`}
            aria-label={`${star} estrellas`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-400">{value > 0 ? `${value}/5` : "Sin calificar"}</span>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
