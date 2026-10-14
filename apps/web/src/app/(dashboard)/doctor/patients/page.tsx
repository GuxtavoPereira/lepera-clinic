"use client";

import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, inputClassName } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { maskPhone } from "@/lib/br-format";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/date-format";

type DoctorPatient = {
  id: string;
  user: { name: string; email: string; birthDate: string | null };
  phones: { phone: string }[];
  appointments: { startDatetime: string; status: string }[];
  _count: { appointments: number };
};

type PatientsPage = {
  items: DoctorPatient[];
  page: number;
  totalPages: number;
  total: number;
};

const PAGE_SIZE = 10;

export default function DoctorPatientsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<PatientsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);

    void apiFetch<PatientsPage>(`/patients/mine?${params.toString()}`)
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
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Users className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pacientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pacientes que você atende (com ao menos uma consulta com você).
          </p>
        </div>
      </header>

      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClassName} pl-9`}
            placeholder="Buscar por nome ou e-mail"
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
            : "Você ainda não tem pacientes com consultas."}
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((patient) => (
              <li
                key={patient.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold text-slate-900">
                    {patient.user.name}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {patient.user.email}
                  </p>
                  <p className="text-xs text-slate-400">
                    {patient.user.birthDate &&
                      `Nasc. ${formatDatePtBr(patient.user.birthDate)}`}
                    {patient.phones[0] &&
                      ` · ${maskPhone(patient.phones[0].phone)}`}
                  </p>
                </div>
                <div className="shrink-0 text-sm text-slate-600 sm:text-right">
                  <p>
                    {patient._count.appointments} consulta
                    {patient._count.appointments === 1 ? "" : "s"}
                  </p>
                  {patient.appointments[0] && (
                    <p className="text-xs text-slate-400">
                      Mais recente:{" "}
                      {formatDateTimePtBr(patient.appointments[0].startDatetime)}
                    </p>
                  )}
                </div>
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
    </div>
  );
}
