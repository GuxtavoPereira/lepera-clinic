import Link from "next/link";
import {
  Home,
  FileText,
  Calendar,
  Users,
  ListTodo,
  Briefcase,
  Plus,
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex md:flex-col shrink-0">
      <div className="flex items-center gap-3 p-6 border-b border-slate-100">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground overflow-hidden">
          img
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
            oioi
          </span>

          <span className="text-sm font-bold text-slate-700 truncate">
            oioi
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between overflow-y-auto py-4">
        <nav className="px-4 space-y-1">
          <Link
            href="/home"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium bg-slate-100 text-slate-900 rounded-md transition-colors"
          >
            <Home className="h-5 w-5 text-slate-700" />
            Painel Inicial
          </Link>

          <Link
            href="/requests"
            className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-slate-500" />
              Solicitações
            </div>
          </Link>

          <Link
            href="/appointments"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors"
          >
            <Calendar className="h-5 w-5 text-slate-500" />
            Agenda Geral
          </Link>

          <Link
            href="/patients"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors"
          >
            <Users className="h-5 w-5 text-slate-500" />
            Pacientes
          </Link>

          <Link
            href="/waitlist"
            className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <ListTodo className="h-5 w-5 text-slate-500" />
              Lista de Espera
            </div>
          </Link>
        </nav>

        <div className="px-4 pb-4">
          <hr className="border-slate-100 mb-4" />

          <nav className="space-y-1">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors"
            >
              <Briefcase className="h-5 w-5 text-slate-500" />
              Perfil
            </Link>

            <Link
              href="/new-session"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium bg-slate-50 text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Plus className="h-5 w-5 text-slate-700" />
              Agendar Sessão
            </Link>
          </nav>
        </div>
      </div>
    </aside>
  );
}
