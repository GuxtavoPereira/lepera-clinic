"use client";

import { FormField, inputClassName } from "@/components/forms/form-field";
import { maskCpf } from "@/lib/br-format";

export type PersonalFormState = {
  name: string;
  cpf: string; // com máscara
  birthDate: string; // AAAA-MM-DD
};

type Props = {
  value: PersonalFormState;
  onChange: (patch: Partial<PersonalFormState>) => void;
  /** E-mail só para exibição (não é editável pelo próprio usuário). */
  email?: string;
  /** CPF já cadastrado: só a recepção corrige. */
  cpfLocked?: boolean;
  idPrefix?: string;
};

export function PersonalFields({
  value,
  onChange,
  email,
  cpfLocked = false,
  idPrefix = "personal",
}: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormField id={`${idPrefix}-name`} label="Nome completo">
          <input
            id={`${idPrefix}-name`}
            className={inputClassName}
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
            minLength={2}
          />
        </FormField>
      </div>

      {email !== undefined && (
        <div className="sm:col-span-2">
          <FormField id={`${idPrefix}-email`} label="E-mail">
            <input
              id={`${idPrefix}-email`}
              className={inputClassName}
              value={email}
              readOnly
            />
          </FormField>
        </div>
      )}

      <FormField
        id={`${idPrefix}-cpf`}
        label="CPF"
        hint={
          cpfLocked
            ? "Para corrigir o CPF, procure a recepção."
            : undefined
        }
      >
        <input
          id={`${idPrefix}-cpf`}
          className={inputClassName}
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={value.cpf}
          onChange={(e) => onChange({ cpf: maskCpf(e.target.value) })}
          readOnly={cpfLocked}
          required={!cpfLocked}
          maxLength={14}
        />
      </FormField>

      <FormField id={`${idPrefix}-birthDate`} label="Data de nascimento">
        <input
          id={`${idPrefix}-birthDate`}
          type="date"
          lang="pt-BR"
          className={inputClassName}
          value={value.birthDate}
          onChange={(e) => onChange({ birthDate: e.target.value })}
        />
      </FormField>
    </div>
  );
}
