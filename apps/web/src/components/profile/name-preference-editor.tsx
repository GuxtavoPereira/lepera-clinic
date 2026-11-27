"use client";

import { useRef, useState } from "react";
import { SocialNameFields } from "./social-name-fields";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { syncStoredUserName } from "@/lib/auth";

export type NamedProfile = { id: string; name: string; socialName?: string | null; useSocialName?: boolean };
export function NamePreferenceEditor({ profile, onSaved }: { profile: NamedProfile; onSaved: (value: NamedProfile) => void }) {
  const [value, setValue] = useState({ socialName: profile.socialName ?? "", useSocialName: profile.useSocialName ?? false });
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save() {
    if (busy.current) return;
    if (value.socialName.trim().length === 1) { setError("O nome social deve ter pelo menos 2 caracteres."); return; }
    busy.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const updated = await apiFetch<NamedProfile>("/profile/me/name-preference", { method: "PATCH", body: JSON.stringify({ socialName: value.socialName.trim() || null, useSocialName: Boolean(value.socialName.trim() && value.useSocialName) }) });
      syncStoredUserName(updated.id, updated.name);
      onSaved(updated);
      setValue({ socialName: updated.socialName ?? "", useSocialName: updated.useSocialName ?? false });
      setMessage("Preferência salva.");
    } catch (failure) { setError(failure instanceof ApiError ? failure.message : "Não foi possível salvar a preferência."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
    <h2 className="font-semibold">Como deseja ser chamado</h2>
    <SocialNameFields value={value} onChange={(patch) => setValue((old) => ({ ...old, ...patch }))} idPrefix="profile-name" disabled={saving} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Salvando…" : "Salvar preferência"}</Button>
  </section>;
}
