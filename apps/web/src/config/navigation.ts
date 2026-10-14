import {
  Home,
  FileText,
  Calendar,
  Users,
  ListTodo,
  Wallet,
  Package,
  UserCog,
  Clock,
  User,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@lepera/contracts";

export type NavItem = { label: string; href: string; icon: LucideIcon };

const ADMIN_ITEMS: NavItem[] = [
  { label: "Painel", href: "/admin/dashboard", icon: Home },
  { label: "Usuários", href: "/admin/users", icon: UserCog },
  { label: "Financeiro", href: "/admin/financial", icon: Wallet },
  { label: "Estoque", href: "/admin/inventory", icon: Package },
];

export const navigation: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    ...ADMIN_ITEMS,
    { label: "Solicitações", href: "/reception/requests", icon: FileText },
    { label: "Agenda geral", href: "/reception/appointments", icon: Calendar },
  ],
  ADMIN: ADMIN_ITEMS,
  DOCTOR: [
    { label: "Painel", href: "/doctor/dashboard", icon: Home },
    { label: "Agenda", href: "/doctor/calendar", icon: Calendar },
    { label: "Pacientes", href: "/doctor/patients", icon: Users },
    { label: "Prontuários", href: "/doctor/records", icon: ClipboardList },
    { label: "Disponibilidade", href: "/doctor/availability", icon: Clock },
  ],
  PATIENT: [
    { label: "Painel", href: "/patient/dashboard", icon: Home },
    {
      label: "Minhas consultas",
      href: "/patient/appointments",
      icon: Calendar,
    },
    { label: "Perfil", href: "/patient/profile", icon: User },
  ],
  RECEPTIONIST: [
    { label: "Painel", href: "/reception/dashboard", icon: Home },
    { label: "Solicitações", href: "/reception/requests", icon: FileText },
    { label: "Agenda geral", href: "/reception/appointments", icon: Calendar },
    { label: "Pacientes", href: "/reception/patients", icon: Users },
    { label: "Lista de espera", href: "/reception/waitlist", icon: ListTodo },
  ],
};
