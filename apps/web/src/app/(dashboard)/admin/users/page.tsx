"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MoreVertical, UserX, Loader2 } from "lucide-react";
import type { Role, UserResponse } from "@lepera/contracts";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administração",
  DOCTOR: "Profissional",
  PATIENT: "Paciente",
  RECEPTIONIST: "Recepção",
};

const ROLE_FILTERS: Array<{ label: string; value: Role | "ALL" }> = [
  { label: "Todos", value: "ALL" },
  { label: "Administração", value: "ADMIN" },
  { label: "Profissionais", value: "DOCTOR" },
  { label: "Recepção", value: "RECEPTIONIST" },
  { label: "Pacientes", value: "PATIENT" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<UserResponse[]>("/users");
      setUsers(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os usuários. A API está rodando?",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(id: string) {
    setPendingId(id);
    try {
      const updated = await apiFetch<UserResponse>(`/users/${id}/deactivate`, {
        method: "PATCH",
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível desativar o usuário.",
      );
    } finally {
      setPendingId(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchesSearch =
        term.length === 0 ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term);
      return matchesRole && matchesSearch;
    });
  }, [users, search, roleFilter]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
        <p className="text-sm text-slate-500">
          Gerencie quem tem acesso ao sistema da clínica.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div className="flex items-center rounded-md bg-slate-50 px-3 py-2 border border-slate-200 w-full md:w-80 transition-colors focus-within:border-slate-300 focus-within:bg-white">
          <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="bg-transparent text-sm text-slate-600 outline-none w-full placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={roleFilter === f.value ? "default" : "outline"}
              onClick={() => setRoleFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando usuários...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="hidden md:grid grid-cols-[1fr_140px_100px_120px_48px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
              <span>Usuário</span>
              <span>Perfil</span>
              <span>Status</span>
              <span>Desde</span>
              <span></span>
            </div>

            {filtered.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_140px_100px_120px_48px] gap-2 md:gap-4 px-5 py-4 items-center hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {u.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                </div>

                <span className="text-sm text-slate-600">
                  {ROLE_LABEL[u.role]}
                </span>

                <span>
                  {u.isActive ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                      Inativo
                    </span>
                  )}
                </span>

                <span className="text-sm text-slate-500">
                  {formatDate(u.createdAt)}
                </span>

                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pendingId === u.id}
                        />
                      }
                    >
                      {pendingId === u.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreVertical className="h-4 w-4" />
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={!u.isActive}
                        onClick={() => handleDeactivate(u.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <UserX className="h-4 w-4" />
                        Desativar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
