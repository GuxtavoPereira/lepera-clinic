import { getToken, logout } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    // Sessão que existia mas o servidor recusou (token expirado ou conta
    // desativada): encerra a sessão local; o AuthGuard leva ao login.
    // Login com senha errada não cai aqui (ainda não há token).
    if (res.status === 401 && token) {
      logout();
    }

    const body = await res.json().catch(() => null);
    const message = body?.message;
    throw new ApiError(
      res.status,
      typeof message === "string"
        ? message
        : Array.isArray(message)
          ? message.join("; ")
          : "Erro na requisição",
    );
  }

  return res.json() as Promise<T>;
}
