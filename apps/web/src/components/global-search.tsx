"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Search, UserRound, X } from "lucide-react";
import type { Role } from "@lepera/contracts";
import { navigation, profilePath } from "@/config/navigation";
import { ApiError, apiFetch } from "@/lib/api-client";

type PatientResult = {
  id: string;
  user: { name: string; email: string; cpf: string | null };
};
type SearchMode = "system" | "patients";
const PATIENT_SEARCH_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN", "RECEPTIONIST"];
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
const searchKeywords: Record<string, string> = {
  Agenda: "consultas calendario atendimentos horarios",
  Calendário: "agenda consultas horarios disponibilidade",
  Usuários: "cadastro contas funcionarios pacientes",
  Financeiro: "pagamentos valores receitas despesas",
  Estoque: "itens materiais produtos inventario",
  Prontuários: "registros sessoes clinicos",
};

export function GlobalSearch({ role }: { role: Role }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("system");
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSearchPatients = PATIENT_SEARCH_ROLES.includes(role);
  const patientMode = canSearchPatients && mode === "patients";
  const term = query.trim();
  const words = normalize(term).split(/\s+/).filter(Boolean);
  const extraItems = [
    { label: "Meu perfil", href: profilePath(role) },
    { label: "Notificações", href: "/notifications" },
    ...(role === "PATIENT"
      ? [
          {
            label: "Solicitar agendamento",
            href: "/patient/request-appointment",
          },
        ]
      : []),
    ...(["RECEPTIONIST", "SUPER_ADMIN"].includes(role)
      ? [{ label: "Novo agendamento", href: "/reception/appointments/new" }]
      : []),
  ];
  const items = [
    ...new Map(
      [...navigation[role], ...extraItems].map((item) => [item.href, item]),
    ).values(),
  ].filter((item) =>
    words.every((word) =>
      normalize(`${item.label} ${searchKeywords[item.label] ?? ""}`).includes(
        word,
      ),
    ),
  );

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      input.current?.focus();
    } else if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const target = event.target;
      if (
        event.key !== "/" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))
      )
        return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (!open || !patientMode || term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        search: term,
        page: "1",
        pageSize: "10",
      });
      void apiFetch<{ items: PatientResult[] }>(`/patients?${params}`, {
        signal: controller.signal,
      })
        .then((result) => {
          if (!controller.signal.aborted) setPatients(result.items);
        })
        .catch((err: unknown) => {
          if (!controller.signal.aborted)
            setError(
              err instanceof ApiError
                ? err.message
                : "Não foi possível buscar pacientes. Tente novamente.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, patientMode, term]);

  function changeQuery(value: string) {
    if (value.trim() === query.trim()) {
      setQuery(value);
      return;
    }
    setQuery(value);
    setPatients([]);
    setError(null);
    setLoading(patientMode && value.trim().length >= 2);
  }
  function changeMode(next: SearchMode) {
    if (next === mode) return;
    setMode(next);
    setPatients([]);
    setError(null);
    setLoading(next === "patients" && term.length >= 2);
    input.current?.focus();
  }
  function close() {
    setOpen(false);
    setQuery("");
    setPatients([]);
    setLoading(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setLoading(patientMode && term.length >= 2);
        }}
        aria-label="Buscar no sistema"
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Search className="size-4" />
        <span className="hidden lg:inline">Buscar</span>
        <kbd className="ml-10 hidden rounded border bg-background px-1.5 text-xs lg:inline">
          /
        </kbd>
      </button>
      <dialog
        ref={dialog}
        onClose={close}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="fixed inset-0 m-auto max-h-[80dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-xl backdrop:bg-black/50"
      >
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold">
              Buscar
            </h2>
            <button
              type="button"
              aria-label="Fechar busca"
              onClick={close}
              className="rounded-md p-2 hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          </div>
          <div
            role="group"
            aria-label="Onde buscar"
            className="mb-4 flex gap-2"
          >
            <button
              type="button"
              aria-pressed={!patientMode}
              onClick={() => changeMode("system")}
              className={`rounded-lg px-3 py-2 text-sm ${!patientMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Sistema
            </button>
            {canSearchPatients && (
              <button
                type="button"
                aria-pressed={patientMode}
                onClick={() => changeMode("patients")}
                className={`rounded-lg px-3 py-2 text-sm ${patientMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                Pacientes
              </button>
            )}
          </div>
          <label htmlFor={`${titleId}-query`} className="sr-only">
            {patientMode
              ? "Nome, e-mail ou CPF do paciente"
              : "Nome da página ou funcionalidade"}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={input}
              id={`${titleId}-query`}
              type="search"
              autoComplete="off"
              maxLength={100}
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder={
                patientMode
                  ? "Nome, e-mail ou CPF"
                  : "Página ou funcionalidade do sistema"
              }
              className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="mt-4" aria-live="polite" aria-busy={loading}>
            {patientMode ? (
              term.length < 2 ? (
                <p className="py-5 text-center text-sm text-muted-foreground">
                  Digite pelo menos 2 caracteres para buscar pacientes.
                </p>
              ) : loading ? (
                <p
                  role="status"
                  className="flex justify-center gap-2 py-5 text-sm text-muted-foreground"
                >
                  <Loader2 className="size-4 animate-spin" />
                  Buscando pacientes...
                </p>
              ) : error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : patients.length === 0 ? (
                <p className="py-5 text-center text-sm text-muted-foreground">
                  Nenhum paciente encontrado.
                </p>
              ) : (
                <ul className="space-y-1" aria-label="Pacientes encontrados">
                  {patients.map((patient) => {
                    const area =
                      role === "RECEPTIONIST" || role === "SUPER_ADMIN"
                        ? "reception"
                        : "admin";
                    return (
                      <li key={patient.id}>
                        <Link
                          href={`/${area}/patients/${patient.id}`}
                          onClick={close}
                          className="flex items-center gap-3 rounded-xl p-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <UserRound className="size-5 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {patient.user.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {patient.user.email}
                            </span>
                          </span>
                          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : items.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted-foreground">
                Nenhuma página encontrada.
              </p>
            ) : (
              <ul className="space-y-1" aria-label="Páginas encontradas">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span>{item.label}</span>
                      <ArrowUpRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {patientMode && patients.length === 10 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Exibindo os primeiros 10 resultados. Refine a busca para encontrar
              o cadastro desejado.
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Use Tab para escolher um resultado, Enter para abrir e Esc para
            fechar.
          </p>
        </div>
      </dialog>
    </>
  );
}
