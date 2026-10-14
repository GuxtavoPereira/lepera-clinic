"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { maskCpf } from "@/lib/br-format";

export type PickedPatient = { id: string; name: string; email: string };

type Result = {
  id: string;
  user: { name: string; email: string; cpf: string | null };
};

type Props = {
  value: PickedPatient | null;
  onChange: (patient: PickedPatient | null) => void;
};

/** Busca pacientes (nome, e-mail ou CPF) e permite escolher um. */
export function PatientPicker({ value, onChange }: Props) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (term.trim().length < 2) {
      setError("Digite ao menos 2 caracteres.");
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ search: term.trim(), pageSize: "6" });
      const page = await apiFetch<{ items: Result[] }>(
        `/patients?${params.toString()}`,
      );
      setResults(page.items);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível buscar.",
      );
    } finally {
      setSearching(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {value.name}
          </p>
          <p className="truncate text-xs text-slate-500">{value.email}</p>
        </div>
        <button
          type="button"
          aria-label="Trocar paciente"
          onClick={() => {
            onChange(null);
            setResults(null);
          }}
          className="rounded-md p-1 text-slate-500 transition hover:bg-white hover:text-slate-900"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClassName} pl-9`}
            placeholder="Nome, e-mail ou CPF do paciente"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search(e);
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={(e) => void search(e)}
          disabled={searching}
        >
          Buscar
        </Button>
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      {results && results.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum paciente encontrado.</p>
      )}
      {results && results.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {results.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    id: patient.id,
                    name: patient.user.name,
                    email: patient.user.email,
                  })
                }
                className="flex w-full flex-col px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <span className="text-sm font-medium text-slate-900">
                  {patient.user.name}
                </span>
                <span className="text-xs text-slate-500">
                  {patient.user.email}
                  {patient.user.cpf && ` · CPF ${maskCpf(patient.user.cpf)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
