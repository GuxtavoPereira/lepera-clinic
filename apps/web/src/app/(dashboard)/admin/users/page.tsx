"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  MoreVertical,
  UserX,
  UserPlus,
  Loader2,
  Mail,
  Calendar,
  Pencil,
  ShieldCheck,
  UserCheck,
  Users as UsersIcon,
} from "lucide-react";
import { UserFormSheet } from "@/components/users/user-form-sheet";
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

const ROLE_DOT: Record<Role, string> = {
  ADMIN: "bg-blue-500",
  DOCTOR: "bg-purple-500",
  RECEPTIONIST: "bg-pink-500",
  PATIENT: "bg-emerald-500",
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

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

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

  useEffect(() => {
    loadUsers();
  }, []);
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

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const inactive = users.length - active;
    const byRole = users.reduce<Partial<Record<Role, number>>>((acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    }, {});
    return { active, inactive, total: users.length, byRole };
  }, [users]);

  function handleCreate() {
    setEditingUser(null);
    setFormOpen(true);
  }

  function handleEdit(user: UserResponse) {
    setEditingUser(user);
    setFormOpen(true);
  }

  function handleSaved(saved: UserResponse) {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === saved.id);
      return exists
        ? prev.map((u) => (u.id === saved.id ? saved : u))
        : [saved, ...prev];
    });
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
            <Button className="gap-1.5 rounded-[10px]" onClick={handleCreate}>
              <UserPlus className="h-[15px] w-[15px]" />
              Novo Usuário
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center rounded-[10px] bg-white border border-gray-200 px-[13px] py-[11px]">
              <Search className="h-3.5 w-3.5 text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="bg-transparent text-sm text-gray-900 outline-none w-full placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-1 rounded-[10px] bg-white border border-gray-100 p-[5px]">
              {ROLE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setRoleFilter(f.value)}
                  className={
                    roleFilter === f.value
                      ? "rounded-[8px] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground whitespace-nowrap"
                      : "rounded-[8px] px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando usuários...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((u) => (
                <Card
                  key={u.id}
                  className="rounded-[14px] border-gray-100 p-4 flex-row items-start gap-4"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1e2939]">
                        {u.name}
                      </p>
                      {u.isActive ? (
                        <span className="rounded-full bg-[#f0fdfa] text-[#00786f] text-xs font-medium px-2.5 py-0.5">
                          Ativo
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5">
                          Inativo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="h-[11px] w-[11px]" />
                        {u.email}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-[11px] w-[11px]" />
                        Desde {formatDate(u.createdAt)}
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="rounded-full bg-[#faf5ff] text-[#8200db] text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        {ROLE_LABEL[u.role]}
                      </span>
                    </div>
                  </div>

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
                      <DropdownMenuItem onClick={() => handleEdit(u)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
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
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="w-64 shrink-0 flex flex-col gap-4">
          <Card className="rounded-[14px] border-gray-100 p-[17px] flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-[10px] bg-gray-50 flex items-center justify-center">
                <UserCheck className="h-[18px] w-[18px] text-gray-500" />
              </div>
              <span className="text-sm text-gray-500">Ativos</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              {stats.active}
            </span>
          </Card>

          <Card className="rounded-[14px] border-gray-100 p-[17px] flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-[10px] bg-gray-50 flex items-center justify-center">
                <UserX className="h-[18px] w-[18px] text-gray-500" />
              </div>
              <span className="text-sm text-gray-500">Inativos</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              {stats.inactive}
            </span>
          </Card>

          <Card className="rounded-[14px] border-gray-100 p-[17px] flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-[10px] bg-gray-50 flex items-center justify-center">
                <UsersIcon className="h-[18px] w-[18px] text-gray-500" />
              </div>
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              {stats.total}
            </span>
          </Card>

          <Card className="rounded-[14px] border-gray-100 p-[17px]">
            <p className="text-sm font-semibold text-[#1e2939] mb-3">
              Por Perfil
            </p>
            <div className="flex flex-col gap-2">
              {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                <div
                  key={role}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${ROLE_DOT[role]}`}
                    />
                    <span className="text-xs text-gray-500">
                      {ROLE_LABEL[role]}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    {stats.byRole[role] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <UserFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSaved={handleSaved}
      />
    </div>
  );
}
