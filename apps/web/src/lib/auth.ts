import type { Role } from "@lepera/contracts";
import { apiFetch } from "./api-client";

const TOKEN_KEY = "lepera:token";
export const AUTH_EVENT = "lepera:auth-changed";

type LoginResponse = {
  accessToken: string;
  user: { id: string; name: string; email: string; role: Role };
};

export type TokenPayload = { sub: string; role: Role; exp: number };

function notify() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export async function login(email: string, password: string) {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  notify();
  return data.user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  notify();
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function parseToken(token: string | null): TokenPayload | null {
  if (!token) return null;
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as TokenPayload;
    return payload.exp * 1000 < Date.now() ? null : payload;
  } catch {
    return null;
  }
}

export function getCurrentUser(): TokenPayload | null {
  return parseToken(getToken());
}