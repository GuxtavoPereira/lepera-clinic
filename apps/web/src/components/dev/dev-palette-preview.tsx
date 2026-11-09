"use client";

import { useEffect, useState } from "react";
import styles from "./dev-palette-preview.module.css";

const palettes = [
  { id: "original", label: "Original" },
  { id: "cream", label: "Areia e creme", className: styles.cream },
  { id: "coral", label: "Coral suave", className: styles.coral },
  { id: "blue", label: "Azul acinzentado", className: styles.blue },
] as const;

type PaletteId = (typeof palettes)[number]["id"];

export function DevPalettePreview() {
  const [palette, setPalette] = useState<PaletteId>("original");

  useEffect(() => {
    const choice = palettes.find(({ id }) => id === palette);
    if (!choice || !("className" in choice)) return;

    document.body.classList.add(choice.className);
    return () => document.body.classList.remove(choice.className);
  }, [palette]);

  return (
    <label className="fixed right-3 bottom-3 z-40 flex items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-card-foreground shadow-sm">
      Paleta de teste
      <select
        value={palette}
        onChange={(event) => setPalette(event.target.value as PaletteId)}
        className="min-h-11 rounded-md bg-card pr-1 text-sm font-normal text-card-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {palettes.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
