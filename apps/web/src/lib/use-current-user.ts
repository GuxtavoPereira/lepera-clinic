"use client";

import { useSyncExternalStore } from "react";
import { AUTH_EVENT, getStoredUser } from "./auth";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTH_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTH_EVENT, onChange);
  };
}

const getServerSnapshot = () => null;

export function useCurrentUser() {
  return useSyncExternalStore(subscribe, getStoredUser, getServerSnapshot);
}