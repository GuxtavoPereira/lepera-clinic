"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, FormField, inputClassName } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);

    if (newPassword.length < 8) {
      setError("A nova senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação não confere com a nova senha.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/profile/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Senha alterada com sucesso.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível alterar a senha.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <KeyRound className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Segurança</h1>
          <p className="mt-1 text-sm text-slate-500">
            Altere a senha de acesso à sua conta.
          </p>
        </div>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <FormField id="current" label="Senha atual">
          <input
            id="current"
            type="password"
            className={inputClassName}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </FormField>
        <FormField id="new" label="Nova senha" hint="Mínimo de 8 caracteres.">
          <input
            id="new"
            type="password"
            className={inputClassName}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </FormField>
        <FormField id="confirm" label="Confirmar nova senha">
          <input
            id="confirm"
            type="password"
            className={inputClassName}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </FormField>
        <div className="flex justify-end border-t border-slate-100 pt-5">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Alterar senha
          </Button>
        </div>
      </form>
    </div>
  );
}
