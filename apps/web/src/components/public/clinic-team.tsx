"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CircleAlert,
  Loader2,
  Stethoscope,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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

function securePhotoUrl(value: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function TeamPhoto({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
}) {
  const source = securePhotoUrl(photoUrl);

  return (
    <Avatar
      aria-hidden="true"
      className={cn("overflow-hidden rounded-xl after:rounded-xl", className)}
    >
      {source && (
        <AvatarImage
          src={source}
          alt=""
          referrerPolicy="no-referrer"
          className="rounded-none"
        />
      )}
      <AvatarFallback className="rounded-none bg-primary/10 font-semibold text-primary dark:text-sidebar-primary">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function ClinicTeam() {
  const [state, setState] = useState<TeamState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<PublicDoctor | null>(null);
  const activeCard = useRef<HTMLButtonElement | null>(null);

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
            <Loader2
              aria-hidden="true"
              className="size-4 shrink-0 motion-safe:animate-spin"
            />
            Carregando equipe…
          </p>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/35 bg-card p-6"
          >
            <p className="mb-3 flex items-center gap-2 text-foreground">
              <CircleAlert
                aria-hidden="true"
                className="size-5 shrink-0 text-destructive"
              />
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
              <Stethoscope aria-hidden="true" className="size-5 text-primary" />
              Profissionais de psicologia
            </h3>
            {state.team.doctors.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {state.team.doctors.map((doctor) => (
                  <article
                    key={doctor.id}
                    className="group relative flex min-w-0 flex-col rounded-xl border border-s-4 border-border border-s-primary/45 bg-card p-5 shadow-sm transition-colors hover:border-primary/50 focus-within:border-primary/50"
                  >
                    <TeamPhoto
                      name={doctor.name}
                      photoUrl={doctor.photoUrl}
                      className="mb-4 size-16 sm:size-20"
                    />
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
                    <span
                      aria-hidden="true"
                      className="mt-auto flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 group-hover:underline group-focus-within:underline dark:text-sidebar-primary"
                    >
                      Conhecer profissional
                      <ArrowUpRight className="size-4 shrink-0" />
                    </span>
                    <button
                      type="button"
                      className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary dark:focus-visible:outline-sidebar-primary"
                      aria-haspopup="dialog"
                      aria-label={`Conhecer ${doctor.name}`}
                      onClick={(event) => {
                        activeCard.current = event.currentTarget;
                        setSelected(doctor);
                      }}
                    />
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
                  <Users aria-hidden="true" className="size-5 text-primary" />
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
                      <TeamPhoto
                        name={person.name}
                        photoUrl={person.photoUrl}
                        className="size-10"
                      />
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
        <SheetContent
          finalFocus={activeCard}
          className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          <SheetHeader className="flex-row items-center gap-3 pr-12">
            {selected && (
              <TeamPhoto
                name={selected.name}
                photoUrl={selected.photoUrl}
                className="size-16"
              />
            )}
            <div className="min-w-0">
              <SheetTitle>
                {selected?.name ?? "Apresentação profissional"}
              </SheetTitle>
              <SheetDescription>{selected?.specialty}</SheetDescription>
            </div>
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
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
