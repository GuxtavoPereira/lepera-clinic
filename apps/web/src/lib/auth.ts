// apps/web/src/lib/auth.ts
import type { Role } from "@lepera/contracts";
import { apiFetch } from "./api-client";

const TOKEN_KEY = "lepera:token";

type LoginResponse = {
  accessToken: string;
  user: { id: string; name: string; email: string; role: Role };
};

type TokenPayload = { sub: string; role: Role; exp: number };

export async function login(email: string, password: string) {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  return data.user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null; // Next roda esse arquivo no servidor também
  return localStorage.getItem(TOKEN_KEY);
}

/** Decodifica só a "carga" do JWT (não verifica assinatura — isso é papel da API). */
export function getCurrentUser(): TokenPayload | null {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as TokenPayload;
    if (payload.exp * 1000 < Date.now()) {
      logout(); // token vencido
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}