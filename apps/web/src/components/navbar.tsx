import React from "react";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="w-full border-b bg-background shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        <Link href="/" className="text-xl font-bold text-primary">
          Leperapia Clinic
        </Link>

        <nav className="hidden md:flex gap-6 items-center">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
            Sobre nós
          </Link>
          <Link href="/contact" className="text-sm font-medium hover:text-primary transition-colors">
            Contato
          </Link>
        </nav>


        <div>
          <Link 
            href="/auth/login" 
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}