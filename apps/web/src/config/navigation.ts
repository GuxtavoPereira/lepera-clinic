import {
  Home, FileText, Calendar, Users, ListTodo, Wallet,
  Package, UserCog, Clock, User, ClipboardList, ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@lepera/contracts";

export type NavItem = { label: string; href: string; icon: LucideIcon };

const SECURITY_ITEM: NavItem = {
  label: "Segurança",
  href: "/settings/security",
  icon: ShieldCheck,
};

const ADMIN_ITEMS: NavItem[] = [
  { label: "Painel", href: "/admin/dashboard", icon: Home },
  { label: "Usuários", href: "/admin/users", icon: UserCog },
  { label: "Financeiro", href: "/admin/financial", icon: Wallet },
  { label: "Estoque", href: "/admin/inventory", icon: Package },
];

// Só entram aqui rotas que existem em app/(dashboard).
// /notifications fica no sino do cabeçalho, não no menu.
export const navigation: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    ...ADMIN_ITEMS,
    { label: "Solicitações", href: "/reception/requests", icon: FileText },
    { label: "Agenda geral", href: "/reception/appointments", icon: Calendar },
    { label: "Lista de espera", href: "/reception/waitlist", icon: ListTodo },
    SECURITY_ITEM,
  ],
  ADMIN: [...ADMIN_ITEMS, SECURITY_ITEM],
  DOCTOR: [
    { label: "Painel", href: "/doctor/dashboard", icon: Home },
    { label: "Agenda", href: "/doctor/calendar", icon: Calendar },
    { label: "Pacientes", href: "/doctor/patients", icon: Users },
    { label: "Prontuários", href: "/doctor/records", icon: ClipboardList },
    { label: "Disponibilidade", href: "/doctor/availability", icon: Clock },
    { label: "Perfil", href: "/doctor/profile", icon: User },
    SECURITY_ITEM,
  ],
  PATIENT: [
    { label: "Painel", href: "/patient/dashboard", icon: Home },
    { label: "Minhas consultas", href: "/patient/appointments", icon: Calendar },
    { label: "Lista de espera", href: "/patient/waitlist", icon: ListTodo },
    { label: "Perfil", href: "/patient/profile", icon: User },
    SECURITY_ITEM,
  ],
  RECEPTIONIST: [
    { label: "Painel", href: "/reception/dashboard", icon: Home },
    { label: "Solicitações", href: "/reception/requests", icon: FileText },
    { label: "Agenda geral", href: "/reception/appointments", icon: Calendar },
    { label: "Pacientes", href: "/reception/patients", icon: Users },
    { label: "Lista de espera", href: "/reception/waitlist", icon: ListTodo },
    { label: "Perfil", href: "/reception/profile", icon: User },
    SECURITY_ITEM,
  ],
};
