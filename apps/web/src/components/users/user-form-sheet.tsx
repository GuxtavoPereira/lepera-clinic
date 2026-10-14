// apps/web/src/components/users/user-form-sheet.tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Role, UserResponse } from "@lepera/contracts";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super administrador",
  ADMIN: "Administração",
  DOCTOR: "Profissional",
  RECEPTIONIST: "Recepção",
  PATIENT: "Paciente",
};

const CREATABLE_ROLES: Role[] = ["ADMIN", "DOCTOR", "RECEPTIONIST", "PATIENT"];

const inputClassName =
  "rounded-[10px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse | null;
  onSaved: (user: UserResponse) => void;
};

export function UserFormSheet({ open, onOpenChange, user, onSaved }: Props) {
  const isEdit = !!user;
  const actor = useCurrentUser();

  const roleOptions = CREATABLE_ROLES.filter(
    (value) => value !== "ADMIN" || actor?.role === "SUPER_ADMIN",
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("RECEPTIONIST");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPassword("");
    setRole(user?.role ?? "RECEPTIONIST");
    setLicenseNumber("");
    setSpecialty("");
  }, [open, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const saved = isEdit
        ? await apiFetch<UserResponse>(`/users/${user.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name, email }),
          })
        : await apiFetch<UserResponse>("/users", {
            method: "POST",
            body: JSON.stringify({
              name,
              email,
              password,
              role,
              ...(role === "DOCTOR"
                ? {
                    licenseNumber: licenseNumber.trim(),
                    specialty: specialty.trim(),
                  }
                : {}),
            }),
          });

      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>
              {isEdit ? "Editar usuário" : "Novo usuário"}
            </SheetTitle>
            <SheetDescription>
              {isEdit
                ? "Altere o nome ou o e-mail deste usuário."
                : "Preencha os dados para criar um novo acesso ao sistema."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                Nome
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClassName}
              />
            </div>

            {!isEdit && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Mínimo de 8 caracteres"
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="role"
                    className="text-sm font-medium text-gray-700"
                  >
                    Perfil
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className={inputClassName}
                  >
                    {roleOptions.map((value) => (
                      <option key={value} value={value}>
                        {ROLE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                  {actor?.role !== "SUPER_ADMIN" && (
                    <p className="text-xs text-gray-400">
                      Administradores só podem ser criados pelo super
                      administrador.
                    </p>
                  )}
                </div>

                {role === "DOCTOR" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="licenseNumber"
                        className="text-sm font-medium text-gray-700"
                      >
                        Registro profissional (CRP/CRM)
                      </label>
                      <input
                        id="licenseNumber"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        required
                        minLength={3}
                        placeholder="Ex.: CRP 06/123456"
                        className={inputClassName}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="specialty"
                        className="text-sm font-medium text-gray-700"
                      >
                        Especialidade
                      </label>
                      <input
                        id="specialty"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        required
                        minLength={2}
                        placeholder="Ex.: Psicologia Clínica"
                        className={inputClassName}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {isEdit && (
              <p className="text-xs text-gray-400">
                O perfil ({ROLE_LABELS[user.role]}) e a senha não podem ser
                alterados por aqui ainda.
              </p>
            )}

            {error && (
              <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <SheetFooter className="flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
