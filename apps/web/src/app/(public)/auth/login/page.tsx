"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { login } from "@/lib/auth";
import { ApiError } from "@/lib/api-client";
import { HOME_BY_ROLE } from "@/config/access";
import { GooglePreviewButton } from "@/components/auth/google-preview-button";
import { requestedSlotPath } from "@/lib/google-preview";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const user = await login(email.trim(), password);
      const requestedPage = new URLSearchParams(window.location.search).get(
        "next",
      );
      router.push(
        user.role === "PATIENT" &&
          requestedPage === "/patient/request-appointment"
          ? requestedSlotPath()
          : (HOME_BY_ROLE[user.role] ?? "/"),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível entrar. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.screen}>
        <div className={styles.brandpanel}>
          <svg className={styles.crest} viewBox="0 0 32 32" fill="none">
            <circle
              cx="16"
              cy="16"
              r="15"
              stroke="#F7FAF6"
              strokeWidth="1.3"
              opacity="0.5"
            />
            <path
              d="M16 9v14M9 16h14"
              stroke="#F7FAF6"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
          </svg>

          <h1>Bem-vindo de volta à Leperapia Clinic</h1>
          <p>Entre para acompanhar consultas e sua equipe de cuidado.</p>
        </div>

        <form
          className={styles.formwrap}
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogin();
          }}
        >
          <div
            className={`${styles.field} ${error ? styles.fieldError : ""}`}
          >
            <label htmlFor="email">E-mail</label>

            <div className={styles.inputShell}>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16v12H4z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 7l8 6 8-6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
              />
            </div>
          </div>

          <div className={`${styles.field} ${error ? styles.fieldError : ""}`}>
            <label htmlFor="senha">Senha</label>

            <div className={styles.inputShell}>
              <svg viewBox="0 0 24 24" fill="none">
                <rect
                  x="5"
                  y="10.5"
                  width="14"
                  height="9.5"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M8 10.5V8a4 4 0 018 0v2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>

              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <Link
            href="/auth/forgot-password"
            className="inline-flex min-h-11 items-center text-sm text-primary underline"
          >
            Esqueci minha senha
          </Link>
          <div className={styles.divider}>
            <div className={styles.line} />
            <span>ou consulte a agenda</span>
            <div className={styles.line} />
          </div>
          <GooglePreviewButton />

          {/* Cadastro */}
          <p className={styles.signup}>
            Ainda não tem cadastro?{" "}
            <Link href="/auth/register">
              <b>Criar conta</b>
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
