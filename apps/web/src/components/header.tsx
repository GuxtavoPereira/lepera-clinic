"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, LogOut, Menu, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
    <header className="grid w-full shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 border-b border-border bg-card px-3 py-2 sm:h-16 sm:grid-cols-[auto_minmax(0,1fr)_auto] lg:px-6">
      <div className="flex items-center gap-1 text-muted-foreground">
        <details
          key={pathname}
          className="relative lg:hidden"
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !event.currentTarget.open) return;
            event.currentTarget.open = false;
            event.currentTarget.querySelector("summary")?.focus();
          }}
        >
          <summary
            className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-border hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
            aria-label="Abrir menu de navegação"
          >
            <Menu aria-hidden="true" className="size-5" />
          </summary>
          <nav
            aria-label="Menu da área restrita"
            className="absolute left-0 top-full z-50 mt-1 max-h-[min(24rem,calc(100dvh_-_5rem))] w-60 max-w-[calc(100vw_-_1.5rem)] overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="flex min-h-11 items-center gap-2 rounded-md p-3 text-sm text-foreground hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:font-medium"
              >
                <item.icon aria-hidden="true" className="size-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.back()}
          className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-accent"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      <div className="col-span-2 col-start-1 row-start-2 min-w-0 truncate pb-1 text-sm text-muted-foreground sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:pb-0">
        <span className="hidden sm:inline">Dashboard / </span>
        <span className="font-semibold text-foreground">{pageTitle(pathname)}</span>
      </div>
      <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-1 sm:col-start-3 sm:gap-3">
        {user && <GlobalSearch role={user.role} />}
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Abrir menu da minha conta"
                className="flex min-h-11 min-w-11 items-center gap-2 rounded-md p-1 hover:bg-accent"
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
                <span className="hidden max-w-48 truncate text-sm font-medium text-foreground xl:block">
                  {user?.name ?? "Minha conta"}
                </span>
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
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
              <DropdownMenuItem render={<Link href={profilePath(user.role)} />}>
                <UserIcon className="size-4" />
                Meu perfil
              </DropdownMenuItem>
            )}
            </DropdownMenuGroup>
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
