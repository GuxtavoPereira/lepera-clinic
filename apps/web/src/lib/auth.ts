import type { Role } from "@lepera/contracts";
import { apiFetch } from "./api-client";

const TOKEN_KEY = "lepera:token";
const USER_KEY = "lepera:user";
export const AUTH_EVENT = "lepera:auth-changed";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type LoginResponse = {
  accessToken: string;
  user: StoredUser;
};

export type TokenPayload = {
  sub: string;
  role: Role;
  exp: number;
};

/** Corpo de POST /auth/register (cadastro público do paciente). */
export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  cpf: string; // só dígitos
  birthDate: string; // AAAA-MM-DD
  phone: string; // só dígitos
  insuranceProvider?: string;
  insuranceNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string; // só dígitos
};

// Cache do usuário para evitar novos objetos a cada leitura
let cachedRaw: string | null | undefined;
let cachedUser: StoredUser | null = null;

function notify() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function persistSession(data: LoginResponse) {
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  notify();
}

export async function login(email: string, password: string) {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  persistSession(data);
  return data.user;
}

/** Cadastra o paciente e já deixa a sessão aberta. */
export async function registerPatient(payload: RegisterPayload) {
  const data = await apiFetch<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  persistSession(data);
  return data.user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notify();
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);

  // Se o armazenamento não mudou, retorna a mesma referência
  if (raw === cachedRaw) {
    return cachedUser;
  }

  cachedRaw = raw;

  if (!raw) {
    cachedUser = null;
    return null;
  }

  try {
    cachedUser = JSON.parse(raw) as StoredUser;
  } catch {
    cachedUser = null;
  }

  return cachedUser;
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
