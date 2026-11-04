"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Stethoscope, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PublicDoctor = {
  id: string;
  name: string;
  specialty: string;
  clinicalApproach: string | null;
  bio: string | null;
  licenseNumber: string;
  photoUrl: string | null;
};
type Team = {
  doctors: PublicDoctor[];
  receptionists: { id: string; name: string; photoUrl: string | null }[];
};
type TeamState =
  { status: "loading" } | { status: "error" } | { status: "ready"; team: Team };

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ClinicTeam() {
  const [state, setState] = useState<TeamState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<PublicDoctor | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
        const response = await fetch(`${base}/api/public/clinic/team`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Equipe indisponível");
        const team = (await response.json()) as Team;
        if (!controller.signal.aborted) setState({ status: "ready", team });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  return (
    <section
      id="equipe"
      aria-labelledby="team-title"
      className="mx-auto grid max-w-6xl scroll-mt-24 items-start gap-8 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-[0.85fr_1.5fr] lg:gap-12"
    >
      <div className="max-w-2xl lg:pt-3">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary dark:text-sidebar-primary">
          Nossos profissionais
        </p>
        <h2
          id="team-title"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Conheça a nossa equipe.
        </h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Conheça os profissionais de psicologia, suas especialidades e
          abordagens. Nossa recepção acompanha as solicitações e ajuda a
          organizar seu atendimento.
        </p>
      </div>
      <div className="min-w-0">
        {state.status === "loading" && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl border border-border p-6 text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin" />
            Carregando equipe…
          </p>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="rounded-xl border border-border bg-card p-6"
          >
            <p className="mb-3 text-muted-foreground">
              Não foi possível carregar a equipe agora.
            </p>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((value) => value + 1);
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {state.status === "ready" && (
          <>
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
              <Stethoscope className="size-5 text-primary" />
              Profissionais de psicologia
            </h3>
            {state.team.doctors.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {state.team.doctors.map((doctor) => (
                  <article
                    key={doctor.id}
                    className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary dark:text-sidebar-primary"
                    >
                      {initials(doctor.name)}
                    </span>
                    <h4 className="text-lg font-semibold text-foreground">
                      {doctor.name}
                    </h4>
                    <p className="mt-1 text-sm font-medium text-primary dark:text-sidebar-primary">
                      {doctor.specialty}
                    </p>
                    {doctor.clinicalApproach && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Abordagem: {doctor.clinicalApproach}
                      </p>
                    )}
                    <p className="mb-5 mt-2 text-xs text-muted-foreground">
                      Registro profissional: {doctor.licenseNumber}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-auto min-h-11 w-full"
                      onClick={() => setSelected(doctor)}
                      aria-label={`Conhecer ${doctor.name}`}
                    >
                      Conhecer profissional
                      <ArrowUpRight className="size-4" />
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-border p-5 text-muted-foreground">
                A apresentação dos profissionais estará disponível em breve.
              </p>
            )}
            {state.team.receptionists.length > 0 && (
              <div className="mt-5 rounded-2xl border border-border bg-card p-5">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  <Users className="size-5 text-primary" />
                  Recepção
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Apoio para acompanhar solicitações, confirmações e encaixes.
                </p>
                <ul className="mt-5 flex flex-wrap gap-3">
                  {state.team.receptionists.map((person) => (
                    <li
                      key={person.id}
                      className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                      >
                        {initials(person.name)}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {person.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
          <SheetHeader className="pr-10">
            <SheetTitle>
              {selected?.name ?? "Apresentação profissional"}
            </SheetTitle>
            <SheetDescription>{selected?.specialty}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-6 p-4">
              <dl className="space-y-4 rounded-xl bg-muted/60 p-5 text-sm">
                <div>
                  <dt className="text-muted-foreground">
                    Registro profissional
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {selected.licenseNumber}
                  </dd>
                </div>
                {selected.clinicalApproach && (
                  <div>
                    <dt className="text-muted-foreground">Abordagem clínica</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {selected.clinicalApproach}
                    </dd>
                  </div>
                )}
              </dl>
              <div>
                <h3 className="font-semibold text-foreground">Apresentação</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {selected.bio ||
                    "A apresentação deste profissional será disponibilizada em breve. Consulte a agenda para conhecer os horários de atendimento."}
                </p>
              </div>
              <Link
                href={`/explore/calendar?doctorId=${encodeURIComponent(selected.id)}`}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Ver horários
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
