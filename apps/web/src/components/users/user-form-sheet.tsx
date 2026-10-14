// apps/web/src/components/users/user-form-sheet.tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { CreateUserBaseInput, Role, UserResponse } from "@lepera/contracts";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { isValidCpf, maskCpf, onlyDigits } from "@/lib/br-format";
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

const CREATABLE_ROLES: Role[] = [
  "ADMIN",
  "DOCTOR",
  "RECEPTIONIST",
  "PATIENT",
];

const inputClassName =
  "rounded-[10px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse | null;
  onSaved: (user: UserResponse) => void;
};

type FormContentProps = {
  user: UserResponse | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: UserResponse) => void;
};

export function UserFormSheet({
  open,
  onOpenChange,
  user,
  onSaved,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {open && (
          <UserFormContent
            key={user?.id ?? "new-user"}
            user={user}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function UserFormContent({
  user,
  onOpenChange,
  onSaved,
}: FormContentProps) {
  const isEdit = !!user;
  const actor = useCurrentUser();

  const roleOptions = CREATABLE_ROLES.filter(
    (value) => value !== "ADMIN" || actor?.role === "SUPER_ADMIN",
  );

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [role, setRole] = useState<Role>(
    user?.role ?? "RECEPTIONIST",
  );
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!isEdit && !isValidCpf(cpf)) {
      setError("Informe um CPF válido para criar o usuário.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const createPayload: CreateUserBaseInput & {
        role: Role;
        licenseNumber?: string;
        specialty?: string;
      } = {
        name: name.trim(),
        email: email.trim(),
        password,
        cpf: onlyDigits(cpf),
        role,
        ...(role === "DOCTOR"
          ? {
              licenseNumber: licenseNumber.trim(),
              specialty: specialty.trim(),
            }
          : {}),
      };

      const saved = isEdit
        ? await apiFetch<UserResponse>(`/users/${user.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name, email }),
          })
        : await apiFetch<UserResponse>("/users", {
            method: "POST",
            body: JSON.stringify(createPayload),
          });

      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
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

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
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
              <label htmlFor="user-cpf" className="text-sm font-medium text-gray-700">
                CPF
              </label>
              <input
                id="user-cpf"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                required
                maxLength={14}
                placeholder="000.000.000-00"
                className={inputClassName}
              />
            </div>

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

        {isEdit && user && (
          <p className="text-xs text-gray-400">
            O perfil ({ROLE_LABELS[user.role]}) e a senha não podem ser
            alterados por aqui ainda.
          </p>
        )}

        {error && (
          <div role="alert" className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
  );
}
