"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { navigation } from "@/config/navigation";
import type { Role } from "@lepera/contracts";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administração",
  DOCTOR: "Profissional",
  PATIENT: "Paciente",
  RECEPTIONIST: "Recepção",
};

export function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    // localStorage só existe no navegador, por isso lemos aqui e não no render
    setRole(getCurrentUser()?.role ?? null);
  }, []);

  const items = role ? navigation[role] : [];

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
    </aside>
  );
}