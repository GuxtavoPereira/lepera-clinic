"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Bookmark,
  Search,
  Sun,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/lib/use-current-user";
import { logout } from "@/lib/auth";
import { NotificationBell } from "@/components/notification-bell";
import { navigation } from "@/config/navigation";

// Páginas que não aparecem no menu lateral mas precisam de título.
const EXTRA_TITLES: Record<string, string> = {
  "/patient/request-appointment": "Solicitar agendamento",
  "/reception/appointments/new": "Novo agendamento",
  "/doctor/session": "Prontuário da sessão",
  "/doctor/clinical-history": "Histórico clínico",
};

const navItems = Object.values(navigation).flat();

// Título = item do menu cujo href é o prefixo mais longo da rota atual.
function pageTitle(pathname: string) {
  const extra = Object.entries(EXTRA_TITLES).find(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (extra) return extra[1];

  const match = navItems
    .filter(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  return match?.label ?? "Visão Geral";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const currentPage = pageTitle(pathname);
  const items = user ? navigation[user.role] : [];

  function handleLogout() {
    logout();
    router.push("/auth/login");
  }

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <details key={pathname} className="relative md:hidden">
          <summary className="cursor-pointer rounded-md border px-2 py-1" aria-label="Abrir menu de navegação">Menu</summary>
          <nav aria-label="Menu da área restrita" className="absolute left-0 top-10 z-50 w-60 max-h-96 overflow-y-auto rounded-lg border bg-white p-2 shadow-lg">
            {items.map((item) => (
              <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className="flex items-center gap-2 rounded-md p-3 text-slate-700 hover:bg-slate-100">
                <item.icon className="h-4 w-4" />{item.label}
              </Link>
            ))}
          </nav>
        </details>
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.back()}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 transition-colors">
          <Bookmark className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5 ml-1">
          <span>Dashboard</span>
          <span>/</span>
          <span className="font-semibold text-slate-800">{currentPage}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center rounded-md bg-slate-50 px-3 py-1.5 border border-slate-200 transition-colors focus-within:border-slate-300 focus-within:bg-white">
          <Search className="h-4 w-4 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar"
            className="bg-transparent text-sm text-slate-600 outline-none w-32 placeholder:text-slate-400"
          />
          <div className="ml-2 flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white text-[10px] font-medium text-slate-400 shadow-sm">
            /
          </div>
        </div>

        <div className="hidden lg:block h-6 w-px bg-slate-200"></div>

        <div className="flex items-center gap-2 text-slate-400">
          <button className="p-2 hover:bg-slate-100 hover:text-slate-600 rounded-md transition-colors">
            <Sun className="h-5 w-5" />
          </button>
          <NotificationBell />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-slate-100 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {user ? (
                      initials(user.name)
                    ) : (
                      <UserIcon className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                <span className="hidden md:block text-sm font-medium text-slate-700">
                  {user?.name ?? "Minha conta"}
                </span>
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
