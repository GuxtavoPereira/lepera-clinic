"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, inputClassName } from "@/components/forms/form-field";
import { NewPatientSheet } from "@/components/patients/new-patient-sheet";
import { ApiError, apiFetch } from "@/lib/api-client";
import { maskCpf, maskPhone } from "@/lib/br-format";
import { formatDatePtBr } from "@/lib/date-format";

type PatientListItem = {
  id: string;
  status: string;
  user: {
    name: string;
    email: string;
    cpf: string | null;
    birthDate: string | null;
    isActive: boolean;
  };
  phones: { phone: string }[];
  responsibleDoctor: { user: { name: string } } | null;
};

type PatientsPage = {
  items: PatientListItem[];
  page: number;
  totalPages: number;
  total: number;
};

const PAGE_SIZE = 10;

export default function ReceptionPatientsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<PatientsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);

    void apiFetch<PatientsPage>(`/patients?${params.toString()}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar os pacientes.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, page, reloadKey]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setSearch(searchInput.trim());
    setReloadKey((key) => key + 1);
  }

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Pacientes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Cadastro e consulta de pacientes da clínica.
            </p>
          </div>
        </div>
        <Button type="button" onClick={() => setSheetOpen(true)}>
          <UserPlus className="size-4" />
          Novo paciente
        </Button>
      </header>

      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClassName} pl-9`}
            placeholder="Buscar por nome, e-mail ou CPF"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando pacientes...</p>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          {search
            ? "Nenhum paciente encontrado para esta busca."
            : "Nenhum paciente cadastrado ainda."}
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((patient) => (
              <li key={patient.id}>
                <Link
                  href={`/reception/patients/${patient.id}`}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold text-slate-900">
                      {patient.user.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {patient.user.email}
                    </p>
                    <p className="text-xs text-slate-400">
                      {patient.user.cpf
                        ? `CPF ${maskCpf(patient.user.cpf)}`
                        : "CPF não informado"}
                      {patient.user.birthDate &&
                        ` · Nasc. ${formatDatePtBr(patient.user.birthDate)}`}
                      {patient.phones[0] &&
                        ` · ${maskPhone(patient.phones[0].phone)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    {patient.responsibleDoctor && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        {patient.responsibleDoctor.user.name}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-3 py-1 font-medium ${
                        patient.user.isActive
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {patient.user.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {data.total} paciente{data.total === 1 ? "" : "s"} · página{" "}
              {data.page} de {data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => goToPage(data.page - 1)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => goToPage(data.page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}

      {sheetOpen && <NewPatientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={() => {
          setLoading(true);
          setReloadKey((key) => key + 1);
        }}
      />}
    </div>
  );
}
