"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{ message: string }>(
        "/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        },
      );
      setMessage(result.message);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível solicitar. Verifique sua conexão.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">Esqueci minha senha</h1>
      <p className="mt-3 text-muted-foreground">
        Informe o e-mail do seu cadastro. O link de recuperação vale por 30
        minutos.
      </p>
      <form
        onSubmit={submit}
        className="mt-6 space-y-5 rounded-2xl border bg-card p-6"
      >
        <div>
          <label htmlFor="recovery-email" className="text-sm font-medium">
            E-mail
          </label>
          <input
            id="recovery-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 h-11 w-full rounded-md border bg-background px-3"
            aria-describedby={error ? "recovery-error" : undefined}
          />
        </div>
        {error && (
          <p
            id="recovery-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"
          >
            {message} Confira também a pasta de spam.
          </p>
        )}
        <Button className="min-h-11 w-full" type="submit" disabled={busy}>
          {busy ? "Solicitando…" : "Enviar link de recuperação"}
        </Button>
        <Link
          href="/auth/login"
          className="inline-flex min-h-11 items-center text-sm text-primary underline"
        >
          Voltar para entrar
        </Link>
      </form>
    </div>
  );
}
