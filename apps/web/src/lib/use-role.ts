"use client";

import { useSyncExternalStore } from "react";
import type { Role } from "@lepera/contracts";
import { AUTH_EVENT, getToken, parseToken } from "./auth";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTH_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTH_EVENT, onChange);
  };
}

const getSnapshot = (): Role | null => parseToken(getToken())?.role ?? null;
const getServerSnapshot = (): Role | null => null;

export function useRole(): Role | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}