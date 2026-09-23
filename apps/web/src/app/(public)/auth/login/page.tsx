"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function handleLogin() {
    if (email === "teste" && password === "123") {
      router.push("/admin/dashboard");
    } else {
      setError(true);
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
          <p>
            Entre para acompanhar consultas, exames e sua equipe de cuidado.
          </p>
        </div>

        <div className={styles.formwrap}>
          <div
            className={`${styles.field} ${error ? styles.fieldError : styles.focused}`}
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
                type="text"
                placeholder="teste123"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(false);
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
              />
            </div>
          </div>

          {error && <p className={styles.error}>E-mail ou senha incorretos.</p>}

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleLogin}
          >
            Entrar
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

          {/* Divisor */}
          <div className={styles.divider}>
            <div className={styles.line}></div>

            <span>ou continue com</span>

            <div className={styles.line}></div>
          </div>

          {/* Login alternativo */}
          <div className={styles.altActions}>
            <div className={styles.altBtn}>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M21.6 12.2c0-.7-.06-1.4-.18-2H12v3.8h5.4a4.6 4.6 0 01-2 3v2.5h3.2c1.9-1.75 3-4.35 3-7.3z"
                  fill="#4285F4"
                />

                <path
                  d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .95-3.4.95-2.6 0-4.8-1.75-5.6-4.1H3.1v2.6C4.7 19.7 8.1 22 12 22z"
                  fill="#34A853"
                />

                <path
                  d="M6.4 13.95a6 6 0 010-3.9V7.45H3.1a10 10 0 000 9.1l3.3-2.6z"
                  fill="#FBBC05"
                />

                <path
                  d="M12 6.05c1.5 0 2.8.5 3.85 1.5l2.85-2.85C16.95 2.9 14.7 2 12 2 8.1 2 4.7 4.3 3.1 7.45l3.3 2.6c.8-2.35 3-4 5.6-4z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </div>

            <div className={styles.altBtn}>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 3v3.5a3 3 0 003 3 3 3 0 003-3V3M6 21v-3.5a3 3 0 013-3h6a3 3 0 013 3V21"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <rect
                  x="7"
                  y="10"
                  width="10"
                  height="4"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              Face ID
            </div>
          </div>

          {/* Cadastro */}
          <p className={styles.signup}>
            Ainda não tem cadastro? <b>Criar conta</b>
          </p>
        </div>
      </div>
    </div>
  );
}
