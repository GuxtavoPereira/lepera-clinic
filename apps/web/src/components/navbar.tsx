import Link from "next/link";
import { Menu, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <HeartPulse className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">
            Leperapia
          </span>
        </Link>

        <div className="hidden md:flex gap-8 items-center">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Início
          </Link>
          <Link
            href="/sobre"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            A Clínica
          </Link>
          <Link
            href="/servicos"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Especialidades
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden md:block text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Entrar
          </Link>
          <Button className="hidden md:flex">Agendar Consulta</Button>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <Menu className="h-6 w-6" />
              </SheetTrigger>

              <SheetContent side="right" className="w-[300px]">
                <SheetTitle className="text-left text-xl font-bold text-primary mb-6">
                  Menu
                </SheetTitle>
                <nav className="flex flex-col gap-4">
                  <Link
                    href="/"
                    className="text-lg font-medium text-muted-foreground hover:text-primary"
                  >
                    Início
                  </Link>
                  <Link
                    href="/sobre"
                    className="text-lg font-medium text-muted-foreground hover:text-primary"
                  >
                    A Clínica
                  </Link>
                  <Link
                    href="/login"
                    className="text-lg font-medium text-muted-foreground hover:text-primary"
                  >
                    Entrar (Login)
                  </Link>
                  <hr className="my-4" />
                  <Button className="w-full">Agendar Consulta</Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
