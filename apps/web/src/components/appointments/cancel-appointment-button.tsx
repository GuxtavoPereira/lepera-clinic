"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";

type Props = {
  appointmentId: string;
  /** Chamado depois do cancelamento, para a página recarregar os dados. */
  onCancelled: () => void | Promise<void>;
};

export function CancelAppointmentButton({ appointmentId, onCancelled }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/appointments/${appointmentId}/cancel`, {
        method: "PATCH",
        body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}),
      });
      await onCancelled();
      setConfirming(false);
      setReason("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cancelar a consulta.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <X className="size-3.5" />
        Cancelar consulta
      </Button>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-800">
        Cancelar esta consulta? O horário será liberado.
      </p>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={500}
        placeholder="Motivo (opcional)"
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
            setConfirming(false);
            setError(null);
          }}
          disabled={saving}
        >
          Voltar
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => void handleConfirm()}
          disabled={saving}
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Confirmar cancelamento
        </Button>
      </div>
    </div>
  );
}
