"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";

type Props = {
  appointmentId: string;
  /** Chamado depois de enviar o pedido, para a página recarregar os dados. */
  onRequested: () => void | Promise<void>;
};

/** O profissional não cancela direto: envia um pedido que a recepção decide. */
export function RequestCancellationButton({
  appointmentId,
  onRequested,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/cancellation-requests", {
        method: "POST",
        body: JSON.stringify({ appointmentId, reason: reason.trim() }),
      });
      await onRequested();
      setOpen(false);
      setReason("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível enviar o pedido.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Send className="size-3.5" />
        Solicitar cancelamento
      </Button>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-800">
        Solicitar cancelamento? A recepção vai analisar o pedido.
      </p>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={500}
        placeholder="Motivo (obrigatório)"
        className="h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
      />
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={saving}
        >
          Voltar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSend()}
          disabled={saving || reason.trim().length < 5}
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Enviar pedido
        </Button>
      </div>
    </div>
  );
}
