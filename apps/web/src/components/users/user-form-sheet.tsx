"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { Role, UserResponse } from "@lepera/contracts";
import { PSYCHOLOGY_SPECIALTIES } from "@lepera/contracts";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { FormField, inputClassName } from "@/components/forms/form-field";
import {
  RegistrationFields,
  RegistrationProgress,
  EMPTY_REGISTRATION,
  registrationPayload,
} from "@/components/forms/registration-fields";
import { useRegistrationWizard } from "@/components/forms/use-registration-wizard";
import type {
  RegistrationErrors,
  RegistrationStep,
} from "@/lib/registration-validation";
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
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
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
  const [role, setRole] = useState<Role>(user?.role ?? "PATIENT");
  const patient = role === "PATIENT";
  const wizard = useRegistrationWizard("new-user", patient, {
    ...EMPTY_REGISTRATION,
    name: user?.name ?? "",
    email: user?.email ?? "",
  });
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [saving, setSaving] = useState(false);
  const lastStep = patient ? 3 : 2;
  function doctorErrors(): RegistrationErrors {
    if (role !== "DOCTOR") return {};
    return {
      ...(licenseNumber.trim().length < 3
        ? { licenseNumber: "Informe o registro profissional (CRP/CRM)." }
        : {}),
      ...(specialty.trim().length < 2
        ? { specialty: "Informe a especialidade." }
        : {}),
    };
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (isEdit) {
      const errors: RegistrationErrors = {};
      if (
        wizard.form.name.trim().length < 2 ||
        wizard.form.name.trim().length > 120
      )
        errors.name = "Informe o nome completo, entre 2 e 120 caracteres.";
      if (!/^\S+@\S+\.\S+$/.test(wizard.form.email.trim()))
        errors.email = "Informe um e-mail válido.";
      if (!wizard.showErrors(errors)) return;
    } else {
      if (wizard.step < lastStep) {
        if (
          wizard.validate(wizard.step, wizard.step === 2 ? doctorErrors() : {})
        )
          wizard.goToStep((wizard.step + 1) as RegistrationStep);
        return;
      }
      if (!wizard.validate(undefined, doctorErrors())) return;
    }
    setSaving(true);
    wizard.setGeneralError(null);
    try {
      const base = registrationPayload(wizard.form);
      const path = isEdit
        ? `/users/${user.id}`
        : patient
          ? "/patients"
          : "/users";
      const payload = isEdit
        ? { name: wizard.form.name.trim(), email: wizard.form.email.trim() }
        : patient
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
      wizard.handleApiError(
        err,
        "Não foi possível salvar o cadastro. Seus dados foram mantidos; tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="flex h-full min-h-0 flex-col">
      <SheetHeader className="shrink-0 pr-12">
        <SheetTitle>{isEdit ? "Editar usuário" : "Novo usuário"}</SheetTitle>
        <SheetDescription>
          {isEdit
            ? "Atualize nome e e-mail da conta."
            : "Crie o acesso em etapas. Você pode voltar sem perder os dados."}
        </SheetDescription>
      </SheetHeader>
      {!isEdit && (
        <div className="shrink-0 border-b border-border px-4 pb-4">
          <RegistrationProgress step={wizard.step} patient={patient} />
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {!isEdit && wizard.step === 1 && (
          <FormField id="new-user-role" label="Perfil">
            <select
              id="new-user-role"
              className={inputClassName}
              value={role}
              onChange={(event) => {
                setRole(event.target.value as Role);
                wizard.showErrors({});
              }}
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
            <FormField
              id="new-user-name"
              label="Nome completo"
              error={wizard.errors.name}
            >
              <input
                id="new-user-name"
                required
                minLength={2}
                maxLength={120}
                className={inputClassName}
                value={wizard.form.name}
                aria-invalid={!!wizard.errors.name}
                aria-describedby={
                  wizard.errors.name ? "new-user-name-error" : undefined
                }
                onChange={(event) =>
                  wizard.update({ name: event.target.value })
                }
              />
            </FormField>
            <FormField
              id="new-user-email"
              label="E-mail"
              error={wizard.errors.email}
            >
              <input
                id="new-user-email"
                type="email"
                required
                className={inputClassName}
                value={wizard.form.email}
                aria-invalid={!!wizard.errors.email}
                aria-describedby={
                  wizard.errors.email ? "new-user-email-error" : undefined
                }
                onChange={(event) =>
                  wizard.update({ email: event.target.value })
                }
              />
            </FormField>
          </>
        ) : (
          <RegistrationFields
            value={wizard.form}
            onChange={wizard.update}
            patient={patient}
            prefix="new-user"
            step={wizard.step}
            errors={wizard.errors}
          />
        )}
        {!isEdit && !patient && wizard.step === 2 && (
          <p className="text-xs text-muted-foreground">
            Contato de emergência, responsável legal e plano de saúde são
            exclusivos do cadastro de pacientes.
          </p>
        )}
        {!isEdit && role === "DOCTOR" && wizard.step === 2 && (
          <>
            <FormField
              id="new-user-licenseNumber"
              label="Registro profissional (CRP/CRM)"
              error={wizard.errors.licenseNumber}
            >
              <input
                id="new-user-licenseNumber"
                required
                minLength={3}
                className={inputClassName}
                value={licenseNumber}
                aria-invalid={!!wizard.errors.licenseNumber}
                aria-describedby={
                  wizard.errors.licenseNumber
                    ? "new-user-licenseNumber-error"
                    : undefined
                }
                onChange={(event) => {
                  setLicenseNumber(event.target.value);
                  wizard.clearFieldError("licenseNumber");
                }}
              />
            </FormField>
            <FormField
              id="new-user-specialty"
              label="Especialidade"
              error={wizard.errors.specialty}
            >
              <select
                id="new-user-specialty"
                required
                className={inputClassName}
                value={specialty}
                aria-invalid={!!wizard.errors.specialty}
                aria-describedby={
                  wizard.errors.specialty
                    ? "new-user-specialty-error"
                    : undefined
                }
                onChange={(event) => {
                  setSpecialty(event.target.value);
                  wizard.clearFieldError("specialty");
                }}
              >
                <option value="">Selecione uma especialidade</option>
                {PSYCHOLOGY_SPECIALTIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Especialidades reconhecidas pelo CFP. A abordagem, como TCC ou
                Psicanálise, é informada separadamente no perfil profissional.
              </p>
            </FormField>
          </>
        )}
        {wizard.generalError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
          >
            {wizard.generalError}
          </p>
        )}
      </div>
      <SheetFooter className="shrink-0 flex-row justify-between gap-3 border-t border-border bg-popover">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={saving}
          onClick={() =>
            isEdit || wizard.step === 1
              ? onOpenChange(false)
              : wizard.goToStep((wizard.step - 1) as RegistrationStep)
          }
        >
          {!isEdit && wizard.step > 1 && <ArrowLeft className="size-4" />}
          {isEdit || wizard.step === 1 ? "Cancelar" : "Voltar"}
        </Button>
        <Button type="submit" disabled={saving} className="min-h-11">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? (
            "Salvar alterações"
          ) : wizard.step < lastStep ? (
            <>
              Continuar
              <ArrowRight className="size-4" />
            </>
          ) : (
            "Criar usuário"
          )}
        </Button>
      </SheetFooter>
    </form>
  );
}
