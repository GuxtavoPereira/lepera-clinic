"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

export function useFinancialResource<T>(path: string, enabled = true) {
  const [result, setResult] = useState<{
    path: string;
    data?: T;
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void apiFetch<T>(path, { signal: controller.signal, cache: "no-store" })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ path, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            path,
            error:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar os dados.",
          });
      });
    return () => controller.abort();
  }, [path, enabled]);
  const current = enabled && result?.path === path ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: enabled && !current,
  };
}
