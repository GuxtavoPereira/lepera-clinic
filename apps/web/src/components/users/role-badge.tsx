import type { Role } from "@lepera/contracts";

const roleStyles: Record<Role, { label: string; tone: string; dot: string }> = {
  SUPER_ADMIN: {
    label: "Super administrador",
    tone: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
    dot: "bg-slate-700 dark:bg-slate-300",
  },
  ADMIN: {
    label: "Administração",
    tone: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
    dot: "bg-violet-600 dark:bg-violet-400",
  },
  DOCTOR: {
    label: "Profissional",
    tone: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
    dot: "bg-blue-600 dark:bg-blue-400",
  },
  RECEPTIONIST: {
    label: "Recepção",
    tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    dot: "bg-amber-700 dark:bg-amber-400",
  },
  PATIENT: {
    label: "Paciente",
    tone: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
    dot: "bg-teal-700 dark:bg-teal-400",
  },
  GUARDIAN: {
    label: "Responsável",
    tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    dot: "bg-emerald-700 dark:bg-emerald-400",
  },
};

export function RoleBadge({ role, label }: { role: Role; label?: string }) {
  const style = roleStyles[role];
  return (
    <span
      className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.tone}`}
    >
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${style.dot}`} />
      {label ?? style.label}
    </span>
  );
}
