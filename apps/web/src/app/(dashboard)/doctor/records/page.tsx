"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Lock } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type RecordSummary = {
  id: string;
  appointmentId: string;
  sessionSequence: number;
  isSigned: boolean;
  signedAt: string | null;
  updatedAt: string;
  appointment: { startDatetime: string };
  patient: { user: { name: string } };
};

type Filter = "ALL" | "PENDING" | "SIGNED";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendente" },
  { value: "SIGNED", label: "Assinado" },
];

export default function DoctorRecordsPage() {
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<RecordSummary[]>("/clinical-records/mine")
      .then((result) => {
        if (active) setRecords(result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar os prontuários.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pendingCount = records.filter((record) => !record.isSigned).length;
  const visible = records.filter((record) =>
    filter === "ALL"
      ? true
      : filter === "SIGNED"
        ? record.isSigned
        : !record.isSigned,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <ClipboardList className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Prontuários</h1>
          <p className="mt-1 text-sm text-slate-500">
            Evoluções clínicas das suas sessões. Para iniciar um novo
            prontuário, abra a consulta pela sua agenda.
          </p>
        </div>
      </header>

      {pendingCount > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pendingCount} evolução{pendingCount === 1 ? "" : "ões"} aguardando
          assinatura.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={
              filter === item.value
                ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando prontuários...</p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Nenhum prontuário neste filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((record) => (
            <li
              key={record.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">
                  {record.patient.user.name}
                </p>
                <p className="text-sm text-slate-500">
                  Sessão {record.sessionSequence} ·{" "}
                  {formatDateTimePtBr(record.appointment.startDatetime)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                    record.isSigned
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {record.isSigned && <Lock className="size-3" />}
                  {record.isSigned ? "Assinado" : "Pendente"}
                </span>
                <Link
                  href={`/doctor/session/${record.appointmentId}`}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  {record.isSigned ? "Ver completo" : "Preencher"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
