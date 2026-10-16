"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Role, UserResponse } from "@lepera/contracts";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { FormField, inputClassName } from "@/components/forms/form-field";
import {
  RegistrationFields,
  EMPTY_REGISTRATION,
  registrationPayload,
  validateRegistration,
  type RegistrationForm,
} from "@/components/forms/registration-fields";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
const LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Superadministrador",
  ADMIN: "Administração",
  DOCTOR: "Profissional",
  RECEPTIONIST: "Recepção",
  PATIENT: "Paciente",
};
const ROLES: Role[] = ["ADMIN", "DOCTOR", "RECEPTIONIST", "PATIENT"];
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse | null;
  onSaved: (user: UserResponse) => void;
};
export function UserFormSheet({ open, onOpenChange, user, onSaved }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {open && (
          <UserFormContent
            key={user?.id ?? "new"}
            user={user}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
function UserFormContent({ user, onOpenChange, onSaved }: Omit<Props, "open">) {
  const actor = useCurrentUser();
  const isEdit = !!user;
  const [form, setForm] = useState<RegistrationForm>({
    ...EMPTY_REGISTRATION,
    name: user?.name ?? "",
    email: user?.email ?? "",
  });
  const [role, setRole] = useState<Role>(user?.role ?? "PATIENT");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function update(patch: Partial<RegistrationForm>) {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const problem = isEdit
      ? null
      : validateRegistration(form, role === "PATIENT");
    if (problem) {
      setError(problem);
      return;
    }
    if (
      !isEdit &&
      role === "DOCTOR" &&
      (licenseNumber.trim().length < 3 || specialty.trim().length < 2)
    ) {
      setError("Informe registro profissional e especialidade.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const base = registrationPayload(form);
      const path = isEdit
        ? `/users/${user.id}`
        : role === "PATIENT"
          ? "/patients"
          : "/users";
      const payload = isEdit
        ? { name: form.name.trim(), email: form.email.trim() }
        : role === "PATIENT"
          ? base
          : {
              name: base.name,
              email: base.email,
              password: base.password,
              cpf: base.cpf,
              birthDate: base.birthDate,
              role,
              ...(role === "DOCTOR"
                ? {
                    licenseNumber: licenseNumber.trim(),
                    specialty: specialty.trim(),
                  }
                : {}),
            };
      const saved = await apiFetch<UserResponse>(path, {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o cadastro.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{isEdit ? "Editar usuário" : "Novo usuário"}</SheetTitle>
        <SheetDescription>
          {isEdit
            ? "Atualize nome e e-mail da conta."
            : "Preencha os dados para criar o acesso ao sistema."}
        </SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {!isEdit && (
          <FormField id="new-user-role" label="Perfil">
            <select
              id="new-user-role"
              className={inputClassName}
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {ROLES.filter(
                (value) => value !== "ADMIN" || actor?.role === "SUPER_ADMIN",
              ).map((value) => (
                <option key={value} value={value}>
                  {LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>
        )}
        {isEdit ? (
          <>
            <FormField id="edit-user-name" label="Nome completo">
              <input
                id="edit-user-name"
                required
                minLength={2}
                className={inputClassName}
                value={form.name}
                onChange={(event) => update({ name: event.target.value })}
              />
            </FormField>
            <FormField id="edit-user-email" label="E-mail">
              <input
                id="edit-user-email"
                type="email"
                required
                className={inputClassName}
                value={form.email}
                onChange={(event) => update({ email: event.target.value })}
              />
            </FormField>
          </>
        ) : (
          <RegistrationFields
            value={form}
            onChange={update}
            patient={role === "PATIENT"}
            prefix="new-user"
          />
        )}
        {!isEdit && role !== "PATIENT" && (
          <p className="text-xs text-muted-foreground">
            Responsável legal, contato de emergência e plano de saúde são dados
            do cadastro de pacientes.
          </p>
        )}
        {!isEdit && role === "DOCTOR" && (
          <>
            <FormField
              id="doctor-license"
              label="Registro profissional (CRP/CRM)"
            >
              <input
                id="doctor-license"
                required
                minLength={3}
                className={inputClassName}
                value={licenseNumber}
                onChange={(event) => setLicenseNumber(event.target.value)}
              />
            </FormField>
            <FormField id="doctor-specialty" label="Especialidade">
              <input
                id="doctor-specialty"
                required
                minLength={2}
                className={inputClassName}
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
              />
            </FormField>
          </>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </div>
      <SheetFooter className="flex-row justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? "Salvar alterações" : "Criar usuário"}
        </Button>
      </SheetFooter>
    </form>
  );
}
