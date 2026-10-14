"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Sobre nós" },
  { href: "/contact", label: "Contato / Agende" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full border-b bg-background shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        <Link href="/" onClick={() => setMenuOpen(false)} className="text-xl font-bold text-primary">
          Leperapia Clinic
        </Link>

        <nav aria-label="Navegação principal" className="hidden md:flex gap-6 items-center">
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium hover:text-primary transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>


        <div className="flex items-center gap-2">
          <Link 
            href="/auth/login" 
            onClick={() => setMenuOpen(false)}
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Login
          </Link>
          <button
            type="button"
            className="rounded-md p-2 hover:bg-muted md:hidden"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setMenuOpen(false);
            }}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="mobile-navigation" aria-label="Navegação principal móvel" className="flex flex-col gap-1 border-t px-4 py-3 md:hidden">
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted hover:text-primary">
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
