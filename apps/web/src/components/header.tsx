"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Bookmark, Search, Sun, Bell, LogOut, User as UserIcon } from "lucide-react";
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

const routeNames: Record<string, string> = {
  "/home": "Início",
  "/requests": "Solicitações",
  "/schedule": "Agenda Geral",
  "/patients": "Pacientes",
  "/waitlist": "Lista de Espera",
  "/profile": "Perfil",
  "/new-session": "Nova Sessão",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const currentPage = routeNames[pathname] || "Visão Geral";

  function handleLogout() {
    logout();
    router.push("/auth/login");
  }

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <button className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 transition-colors">
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
          <button className="relative p-2 hover:bg-slate-100 hover:text-slate-600 rounded-md transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border border-white"></span>
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-slate-100 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {user ? initials(user.name) : <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium text-slate-700">
                {user?.name ?? "Minha conta"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}