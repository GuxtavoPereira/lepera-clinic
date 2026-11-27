"use client";

import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormField, inputClassName } from "@/components/forms/form-field";

export type SocialNameState = { socialName?: string; useSocialName?: boolean };

export function SocialNameFields({ value, onChange, idPrefix, disabled = false, error }: {
  value: SocialNameState;
  onChange: (patch: SocialNameState) => void;
  idPrefix: string;
  disabled?: boolean;
  error?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const needsPrompt = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const socialName = value.socialName ?? "";
  const inputId = `${idPrefix}-socialName`;
  function ask() {
    if (!disabled && socialName.trim().length >= 2 && !dialog.current?.open) dialog.current?.showModal();
  }
  function choose(useSocialName: boolean) {
    needsPrompt.current = false;
    onChange({ useSocialName });
    dialog.current?.close();
    input.current?.focus();
  }
  return (
    <div className="space-y-2">
      <FormField id={inputId} label="Nome social (opcional)" error={error} hint="O nome civil permanece separado para identificação. Você pode mudar esta preferência depois.">
        <input ref={input} id={inputId} className={inputClassName} value={socialName} maxLength={120} minLength={2} disabled={disabled}
          aria-invalid={!!error} aria-describedby={error ? `${inputId}-hint ${inputId}-error` : `${inputId}-hint`}
          onChange={(event) => { needsPrompt.current = true; onChange({ socialName: event.target.value, useSocialName: false }); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && needsPrompt.current && socialName.trim().length >= 2) {
              event.preventDefault();
              ask();
            }
          }}
          onBlur={() => { if (needsPrompt.current) ask(); }} />
      </FormField>
      {socialName.trim().length >= 2 && <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>{value.useSocialName ? "Usar nome social no sistema" : "Usar nome civil no sistema"}</span>
        <Button type="button" variant="outline" disabled={disabled} onClick={ask}>Alterar preferência</Button>
      </div>}
      <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/40"
        onCancel={() => { needsPrompt.current = false; }}>
        <h2 id={titleId} className="text-xl font-semibold">Como deseja ser chamado?</h2>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted-foreground">Deseja usar <strong className="break-words text-foreground">{socialName.trim()}</strong> no sistema, incluindo agenda, atendimento e relatórios? O nome civil continuará guardado para identificação.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={() => choose(true)}>Sim, usar nome social</Button>
          <Button type="button" variant="outline" onClick={() => choose(false)}>Manter nome civil</Button>
        </div>
      </dialog>
    </div>
  );
}
