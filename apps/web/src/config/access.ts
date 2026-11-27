import type { Role } from "@lepera/contracts";

export const HOME_BY_ROLE: Record<Role, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  ADMIN: "/admin/dashboard",
  DOCTOR: "/doctor/dashboard",
  PATIENT: "/patient/dashboard",
  RECEPTIONIST: "/reception/dashboard",
  GUARDIAN: "/guardian/dashboard",
};

const ROLE_PREFIXES: Record<Role, string[]> = {
  SUPER_ADMIN: ["/admin", "/reception", "/rooms"],
  ADMIN: ["/admin", "/rooms"],
  DOCTOR: ["/doctor", "/rooms"],
  PATIENT: ["/patient"],
  RECEPTIONIST: ["/reception", "/rooms"],
  GUARDIAN: ["/guardian"],
};

const SHARED_PREFIXES = ["/notifications", "/settings", "/profile", "/reports"];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccess(role: Role, pathname: string): boolean {
  if (role === "GUARDIAN" && matches(pathname, "/reports")) return false;
  if (SHARED_PREFIXES.some((prefix) => matches(pathname, prefix))) return true;
  return ROLE_PREFIXES[role].some((prefix) => matches(pathname, prefix));
}
