// apps/web/src/components/sidebar/index.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useRole } from "@/lib/use-role";
import { navigation } from "@/config/navigation";
import { logout } from "@/lib/auth";
import type { Role } from "@lepera/contracts";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administração",
  DOCTOR: "Profissional",
  PATIENT: "Paciente",
  RECEPTIONIST: "Recepção",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const role = useRole();

  const items = role ? navigation[role] : [];

  function handleLogout() {
    logout();
    router.push("/auth/login");
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex md:flex-col shrink-0">
      <div className="flex items-center gap-3 p-6 border-b border-slate-100">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground overflow-hidden">
          LC
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
            {role ? ROLE_LABEL[role] : ""}
          </span>
          <span className="text-sm font-bold text-slate-700 truncate">
            Leperapia Clinic
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-4 space-y-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "flex items-center gap-3 px-3 py-2.5 text-sm font-medium bg-slate-100 text-slate-900 rounded-md transition-colors"
                    : "flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors"
                }
              >
                <item.icon
                  className={`h-5 w-5 ${active ? "text-slate-700" : "text-slate-500"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-md transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}