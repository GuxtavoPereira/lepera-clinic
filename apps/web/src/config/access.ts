import type { Role } from "@lepera/contracts";

export const HOME_BY_ROLE: Record<Role, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  ADMIN: "/admin/dashboard",
  DOCTOR: "/doctor/dashboard",
  PATIENT: "/patient/dashboard",
  RECEPTIONIST: "/reception/dashboard",
};

const ROLE_PREFIXES: Record<Role, string[]> = {
  SUPER_ADMIN: ["/admin", "/reception"],
  ADMIN: ["/admin"],
  DOCTOR: ["/doctor"],
  PATIENT: ["/patient"],
  RECEPTIONIST: ["/reception"],
};

const SHARED_PREFIXES = ["/notifications", "/settings"];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccess(role: Role, pathname: string): boolean {
  if (SHARED_PREFIXES.some((prefix) => matches(pathname, prefix))) return true;
  return ROLE_PREFIXES[role].some((prefix) => matches(pathname, prefix));
}
