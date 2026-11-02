"use client";

import { useState } from "react";
import type { FinancialAppointment, FinancialPage } from "@lepera/contracts";
import { FormField, inputClassName } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { appointmentDate } from "./financial-utils";
import { useFinancialResource } from "./use-financial-resource";

export function AppointmentPicker({
  value,
  onChange,
}: {
  value: FinancialAppointment | null;
  onChange: (appointment: FinancialAppointment | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState({ q: "", page: 1 });
  const [retry, setRetry] = useState(0);
  const params = new URLSearchParams({
    q: query.q,
    page: String(query.page),
    pageSize: "10",
  });
  const { data, loading, error } = useFinancialResource<
    FinancialPage<FinancialAppointment>
  >(`/financial/appointments?${params}#${retry}`);

  return (
    <section
      className="space-y-3 rounded-xl border border-border p-4"
      aria-label="Vincular consulta"
    >
      <div>
        <h3 className="font-medium">Vincular a uma consulta (opcional)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Aparecem consultas sem cobrança. Cada consulta pode ter um único
          lançamento.
        </p>
      </div>
      {value ? (
        <div className="space-y-2 rounded-lg bg-primary/10 p-3">
          <p className="font-medium">{value.patientName}</p>
          <p className="text-sm text-muted-foreground">
            {appointmentDate(value.startDatetime)} · {value.doctorName}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(null)}
          >
            Remover vínculo
          </Button>
        </div>
      ) : (
        <>
          <FormField id="appointment-search" label="Paciente ou profissional">
            <div className="flex gap-2">
              <input
                id="appointment-search"
                className={inputClassName}
                value={draft}
                maxLength={120}
                placeholder="Digite um nome"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setQuery({ q: draft.trim(), page: 1 });
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuery({ q: draft.trim(), page: 1 })}
              >
                Buscar
              </Button>
            </div>
          </FormField>
          {loading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Buscando consultas…
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setRetry((n) => n + 1)}
              >
                Tentar novamente
              </button>
            </p>
          ) : null}
          {data ? (
            <>
              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onChange(item)}
                      className="w-full rounded-lg border border-border p-3 text-left transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="block text-sm font-medium">
                        {item.patientName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {appointmentDate(item.startDatetime)} ·{" "}
                        {item.doctorName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {data.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma consulta sem cobrança encontrada.
                </p>
              ) : null}
              {data.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={data.page <= 1}
                    onClick={() => setQuery({ ...query, page: query.page - 1 })}
                  >
                    Anterior
                  </Button>
                  <span>
                    {data.page} de {data.totalPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={data.page >= data.totalPages}
                    onClick={() => setQuery({ ...query, page: query.page + 1 })}
                  >
                    Próxima
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
