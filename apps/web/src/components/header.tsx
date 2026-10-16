"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, LogOut, User as UserIcon } from "lucide-react";
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
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { navigation, profilePath } from "@/config/navigation";
const EXTRA_TITLES: Record<string, string> = {
  "/profile": "Meu perfil",
  "/admin/patients": "Dados do paciente",
  "/patient/request-appointment": "Solicitar agendamento",
  "/reception/appointments/new": "Novo agendamento",
  "/doctor/session": "Prontuário da sessão",
  "/doctor/clinical-history": "Histórico clínico",
};
const navItems = Object.values(navigation).flat();
function pageTitle(pathname: string) {
  const extra = Object.entries(EXTRA_TITLES).find(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (extra) return extra[1];
  return (
    navItems
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Visão geral"
  );
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const items = user ? navigation[user.role] : [];
  function handleLogout() {
    logout();
    router.push("/auth/login");
  }
  return (
    <header className="flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <details key={pathname} className="relative md:hidden">
          <summary
            className="cursor-pointer rounded-md border px-2 py-1"
            aria-label="Abrir menu de navegação"
          >
            Menu
          </summary>
          <nav
            aria-label="Menu da área restrita"
            className="absolute left-0 top-10 z-50 max-h-96 w-60 overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="flex items-center gap-2 rounded-md p-3 text-foreground hover:bg-accent"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.back()}
          className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-accent"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-0 truncate">
          <span className="hidden sm:inline">Dashboard / </span>
          <span className="font-semibold text-foreground">
            {pageTitle(pathname)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        {user && <GlobalSearch role={user.role} />}
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Abrir menu da minha conta"
                className="flex items-center gap-2 rounded-md p-1 hover:bg-accent"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {user ? (
                      initials(user.name)
                    ) : (
                      <UserIcon className="size-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-48 truncate text-sm font-medium text-foreground md:block">
                  {user?.name ?? "Minha conta"}
                </span>
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user && (
              <DropdownMenuItem
                onClick={() => router.push(profilePath(user.role))}
              >
                <UserIcon className="size-4" />
                Meu perfil
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
