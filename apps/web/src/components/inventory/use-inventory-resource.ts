"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

export function useInventoryResource<T>(
  path: string,
  revision: number,
  enabled = true,
) {
  const key = `${path}#${revision}`;
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void apiFetch<T>(path, { signal: controller.signal, cache: "no-store" })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              caught instanceof Error
                ? caught.message
                : "Não foi possível carregar o estoque.",
          });
      });
    return () => controller.abort();
  }, [path, key, enabled]);
  const current = enabled && result?.key === key ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: enabled && !current,
  };
}
