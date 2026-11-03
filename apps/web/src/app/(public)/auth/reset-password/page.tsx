"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { logout } from "@/lib/auth";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      const value = new URLSearchParams(window.location.search).get("token");
      setToken(value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null);
      setReady(true);
      window.history.replaceState(null, "", window.location.pathname);
    });
    return () => {
      active = false;
    };
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || busy) return;
    setError(null);
    if (password !== confirmation) {
      setError("As senhas precisam ser iguais.");
      document.getElementById("reset-confirmation")?.focus();
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Use uma senha com letras e números.");
      document.getElementById("reset-password")?.focus();
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      logout();
      setToken(null);
      setPassword("");
      setConfirmation("");
      setDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível redefinir. Verifique sua conexão.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">Definir nova senha</h1>
      {!ready ? (
        <p role="status" className="mt-6">
          Verificando link…
        </p>
      ) : done ? (
        <div role="status" className="mt-6 space-y-4">
          <p>
            Sua senha foi redefinida e as sessões anteriores foram encerradas.
          </p>
          <Button render={<Link href="/auth/login" />} className="min-h-11">
            Entrar com a nova senha
          </Button>
        </div>
      ) : !token ? (
        <div className="mt-6 space-y-4">
          <p role="alert">
            Este link é inválido. Solicite uma nova recuperação.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-flex min-h-11 items-center text-primary underline"
          >
            Solicitar novo link
          </Link>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="mt-6 space-y-5 rounded-2xl border bg-card p-6"
        >
          <p className="text-sm text-muted-foreground">
            Use de 8 a 72 caracteres, com letras e números.
          </p>
          <div>
            <label htmlFor="reset-password" className="text-sm font-medium">
              Nova senha
            </label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-11 w-full rounded-md border bg-background px-3"
            />
          </div>
          <div>
            <label htmlFor="reset-confirmation" className="text-sm font-medium">
              Confirmar nova senha
            </label>
            <input
              id="reset-confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="mt-2 h-11 w-full rounded-md border bg-background px-3"
              aria-invalid={!!error}
              aria-describedby={error ? "reset-error" : undefined}
            />
          </div>
          {error && (
            <p
              id="reset-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <Button className="min-h-11 w-full" type="submit" disabled={busy}>
            {busy ? "Salvando…" : "Redefinir senha"}
          </Button>
          <Link
            href="/auth/forgot-password"
            className="inline-flex min-h-11 items-center text-sm text-primary underline"
          >
            Solicitar outro link
          </Link>
        </form>
      )}
    </div>
  );
}
