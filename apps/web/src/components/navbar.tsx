"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { HeartPulse, LogIn, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const publicLinks = [
  { href: "/#inicio", label: "Início" },
  { href: "/#atendimentos", label: "Atendimentos" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/#sobre", label: "Sobre nós" },
  { href: "/#espaco", label: "Nosso espaço" },
  { href: "/#contato", label: "Contato" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-1 px-3 sm:gap-2 sm:px-4 md:px-8">
        <Link
          href="/#inicio"
          onClick={() => setMenuOpen(false)}
          className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg text-sm font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-[22.5rem]:gap-2 min-[22.5rem]:text-[0.9375rem] sm:text-lg dark:text-sidebar-primary"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:size-9">
            <HeartPulse aria-hidden="true" className="size-5" />
          </span>
          <span className="truncate">Leperapia Clinic</span>
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-4 lg:flex xl:gap-6"
        >
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary dark:hover:text-sidebar-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 min-[22.5rem]:gap-2">
          <ThemeToggle />
          <Link
            href="/auth/login"
            onClick={() => setMenuOpen(false)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-primary px-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-[22.5rem]:px-3 sm:px-4"
          >
            <LogIn aria-hidden="true" className="size-4 min-[22.5rem]:hidden sm:block" />
            <span className="sr-only min-[22.5rem]:not-sr-only">Login</span>
          </Link>
          <button
            ref={menuButton}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>

      <nav
        id="mobile-navigation"
        aria-label="Navegação principal móvel"
        hidden={!menuOpen}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-y border-border bg-background px-4 py-3 shadow-lg lg:hidden"
      >
        <div className="mx-auto grid max-w-6xl gap-1">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary dark:hover:text-sidebar-primary"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/explore/calendar"
            onClick={() => setMenuOpen(false)}
            className="mt-2 flex min-h-11 items-center rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-primary dark:text-sidebar-primary"
          >
            Horários disponíveis
          </Link>
        </div>
      </nav>
    </header>
  );
}
