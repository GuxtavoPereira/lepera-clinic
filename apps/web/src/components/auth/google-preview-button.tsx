"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import type {
  GooglePreviewChallenge,
  GooglePreviewConfig,
  GooglePreviewSession,
} from "@lepera/contracts";
import { previewFetch, storePreview } from "@/lib/google-preview";
import { Button } from "@/components/ui/button";

type IdentityApi = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    auto_select: boolean;
    ux_mode: "popup";
    callback: (r: { credential: string }) => void;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "continue_with";
      width: number;
      locale: string;
    },
  ) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: IdentityApi } };
  }
}

export function GooglePreviewButton({
  onSuccess,
}: {
  onSuccess?: (s: GooglePreviewSession) => void;
}) {
  const router = useRouter();
  const mount = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<GooglePreviewConfig | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const success = useCallback(
    (session: GooglePreviewSession) => {
      storePreview(session);
      if (onSuccess) onSuccess(session);
      else router.push("/explore/calendar");
    },
    [onSuccess, router],
  );

  useEffect(() => {
    let active = true;
    previewFetch<GooglePreviewConfig>("/auth/google/config")
      .then((c) => {
        if (active) {
          setConfig(c);
          setError(null);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Não foi possível carregar o acesso Google. Tente novamente.",
          );
      });
    return () => {
      active = false;
    };
  }, [retry]);
  useEffect(() => {
    if (!config?.enabled || !config.clientId || !scriptReady) return;
    let active = true;
    async function initialize() {
      try {
        const challenge = await previewFetch<GooglePreviewChallenge>(
          "/auth/google/challenge",
          { method: "POST" },
        );
        const id = window.google?.accounts.id;
        if (!active || !mount.current || !id || !config?.clientId) return;
        id.initialize({
          client_id: config.clientId,
          nonce: challenge.nonce,
          auto_select: false,
          ux_mode: "popup",
          callback: ({ credential }) => {
            if (!active) return;
            setBusy(true);
            setError(null);
            void previewFetch<GooglePreviewSession>("/auth/google/preview", {
              method: "POST",
              body: JSON.stringify({
                credential,
                challenge: challenge.challenge,
              }),
            })
              .then((s) => {
                if (active) success(s);
              })
              .catch((e: unknown) => {
                if (active)
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Não foi possível validar seu acesso.",
                  );
              })
              .finally(() => {
                if (active) setBusy(false);
              });
          },
        });
        mount.current.replaceChildren();
        id.renderButton(mount.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: 280,
          locale: "pt_BR",
        });
      } catch {
        if (active) setError("O acesso Google não carregou. Tente novamente.");
      }
    }
    void initialize();
    const refresh = window.setInterval(() => {
      void initialize();
    }, 4 * 60_000);
    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, [config, scriptReady, retry, success]);

  return (
    <div className="space-y-3 text-center">
      {config?.enabled && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
          onError={() =>
            setError(
              "Não foi possível carregar o Google. Verifique sua conexão.",
            )
          }
        />
      )}
      <p className="text-sm text-muted-foreground">
        Consulte horários livres com sua conta Google.
      </p>
      <div
        ref={mount}
        className={
          busy
            ? "pointer-events-none flex justify-center opacity-60"
            : "flex min-h-11 justify-center"
        }
      />
      {!config && !error && (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando Google…
        </p>
      )}
      {config && !config.enabled && (
        <p className="text-sm text-muted-foreground">
          O acesso Google está em configuração. Você pode criar uma conta ou
          usar seu e-mail e senha.
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm">
          Validando acesso…
        </p>
      )}
      {error && (
        <div>
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 min-h-11"
            onClick={() => {
              setError(null);
              setRetry((n) => n + 1);
            }}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Para solicitar uma consulta, complete seu cadastro com CPF. Este acesso
        não abre dados de pacientes.
      </p>
    </div>
  );
}
